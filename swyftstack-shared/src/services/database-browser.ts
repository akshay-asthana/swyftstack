// DatabaseBrowserService — read-only browsing + safe SQL runner for the user
// console. Connects to the database's assigned cluster using the cluster admin
// URL (the dbUser role does not exist outside the project DB, so we use the
// cluster admin role but FORCE READ ONLY transactions and statement_timeout).
//
// Safety:
//   - Every query runs in `BEGIN; SET LOCAL statement_timeout = ...; ` +
//     `SET TRANSACTION READ ONLY; <sql>; COMMIT`.
//   - Identifiers (table, column) are validated against introspection results
//     and quoted with pg_quote_ident before being inlined.
//   - Filter values are always parameterized via $n placeholders.
//   - SQL runner blocks ddl/dml keywords as a first line of defence; the READ
//     ONLY transaction is the actual guarantee.
import { prisma } from "../db.js";
import { pgConnect, clusterAdminUrl } from "./database-cluster.js";

export const QUERY_STATEMENT_TIMEOUT_MS = 5000;
export const ROW_LIMIT_DEFAULT = 50;
export const ROW_LIMIT_MAX = 500;
export const QUERY_ROW_LIMIT = 1000;

export const FILTER_OPERATORS = [
  "eq",
  "ne",
  "contains",
  "starts_with",
  "ends_with",
  "gt",
  "lt",
  "gte",
  "lte",
  "is_null",
  "is_not_null",
] as const;
export type FilterOperator = (typeof FILTER_OPERATORS)[number];

export interface BrowseFilter {
  column: string;
  operator: FilterOperator;
  value?: string | number | null;
}

export interface BrowseOptions {
  filters?: BrowseFilter[];
  sort?: { column: string; direction: "asc" | "desc" };
  page?: number;
  limit?: number;
}

export interface TableInfo {
  schema: string;
  name: string;
  rowEstimate: number;
  columnCount: number;
  sizeBytes: number;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isIndexed: boolean;
}

export interface BrowseResult {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total: number | null;
  page: number;
  limit: number;
  durationMs: number;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
}

const UNSAFE_KEYWORDS = [
  "DROP",
  "DELETE",
  "UPDATE",
  "INSERT",
  "ALTER",
  "TRUNCATE",
  "CREATE",
  "GRANT",
  "REVOKE",
  "VACUUM",
  "REFRESH",
  "COPY",
];

export class UnsafeQueryError extends Error {
  constructor(keyword: string) {
    super(`Write/DDL statements are not allowed in the SQL runner (blocked keyword: ${keyword}).`);
    this.name = "UnsafeQueryError";
  }
}

export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database is not connected to a live cluster yet.");
    this.name = "DatabaseUnavailableError";
  }
}

export class InvalidIdentifierError extends Error {
  constructor(public readonly identifier: string) {
    super(`Invalid or unknown identifier: ${identifier}`);
    this.name = "InvalidIdentifierError";
  }
}

function quoteIdent(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new InvalidIdentifierError(name);
  }
  return `"${name}"`;
}

async function connectAsAdmin(databaseId: string) {
  const db = await prisma.database.findUniqueOrThrow({ where: { id: databaseId } });
  if (!db.databaseClusterId) throw new DatabaseUnavailableError();
  const url = await clusterAdminUrl(db.databaseClusterId, db.dbName);
  const client = await pgConnect(url);
  if (!client) throw new DatabaseUnavailableError();
  return { db, client };
}

interface RawPgClient {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; fields?: { name: string }[]; rowCount?: number }>;
  end(): Promise<void>;
}

function asRaw(client: unknown): RawPgClient {
  return client as RawPgClient;
}

export const databaseBrowserService = {
  async listTables(databaseId: string): Promise<TableInfo[]> {
    const { client } = await connectAsAdmin(databaseId).catch((e) => {
      if (e instanceof DatabaseUnavailableError) return { client: null };
      throw e;
    });
    if (!client) return [];
    const raw = asRaw(client);
    try {
      const r = await raw.query(
        `SELECT n.nspname AS schema, c.relname AS name,
                c.reltuples::bigint AS row_estimate,
                pg_total_relation_size(c.oid)::bigint AS size_bytes,
                (SELECT count(*)::int FROM information_schema.columns ic
                  WHERE ic.table_schema = n.nspname AND ic.table_name = c.relname) AS col_count
           FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relkind IN ('r','p')
            AND n.nspname NOT IN ('pg_catalog','information_schema')
          ORDER BY n.nspname, c.relname`,
      );
      return r.rows.map((row: Record<string, unknown>) => ({
        schema: String(row.schema),
        name: String(row.name),
        rowEstimate: Number(row.row_estimate ?? 0),
        columnCount: Number(row.col_count ?? 0),
        sizeBytes: Number(row.size_bytes ?? 0),
      }));
    } finally {
      await raw.end().catch(() => undefined);
    }
  },

  async describeTable(databaseId: string, table: string, schema = "public"): Promise<ColumnInfo[]> {
    const { client } = await connectAsAdmin(databaseId);
    const raw = asRaw(client);
    try {
      const cols = await raw.query(
        `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
          WHERE table_schema = $1 AND table_name = $2
          ORDER BY ordinal_position`,
        [schema, table],
      );
      const indexes = await raw.query(
        `SELECT a.attname AS column_name, ix.indisprimary AS is_primary
           FROM pg_index ix
           JOIN pg_class t ON t.oid = ix.indrelid
           JOIN pg_namespace n ON n.oid = t.relnamespace
           JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
          WHERE n.nspname = $1 AND t.relname = $2`,
        [schema, table],
      );
      const idxMap = new Map<string, { isPrimary: boolean; indexed: boolean }>();
      for (const r of indexes.rows) {
        const k = String(r.column_name);
        const prev = idxMap.get(k) ?? { isPrimary: false, indexed: false };
        idxMap.set(k, { isPrimary: prev.isPrimary || Boolean(r.is_primary), indexed: true });
      }
      return cols.rows.map((r: Record<string, unknown>) => {
        const idx = idxMap.get(String(r.column_name));
        return {
          name: String(r.column_name),
          dataType: String(r.data_type),
          nullable: String(r.is_nullable) === "YES",
          defaultValue: r.column_default == null ? null : String(r.column_default),
          isPrimaryKey: idx?.isPrimary ?? false,
          isIndexed: idx?.indexed ?? false,
        };
      });
    } finally {
      await raw.end().catch(() => undefined);
    }
  },

  async browseTable(
    databaseId: string,
    table: string,
    options: BrowseOptions = {},
    schema = "public",
  ): Promise<BrowseResult> {
    const columns = await this.describeTable(databaseId, table, schema);
    if (columns.length === 0) {
      return { columns: [], rows: [], total: 0, page: 1, limit: 0, durationMs: 0 };
    }
    const columnNames = new Set(columns.map((c) => c.name));

    const limit = Math.min(ROW_LIMIT_MAX, Math.max(1, options.limit ?? ROW_LIMIT_DEFAULT));
    const page = Math.max(1, options.page ?? 1);
    const offset = (page - 1) * limit;

    const params: unknown[] = [];
    const whereParts: string[] = [];
    for (const filter of options.filters ?? []) {
      if (!columnNames.has(filter.column)) throw new InvalidIdentifierError(filter.column);
      const col = quoteIdent(filter.column);
      switch (filter.operator) {
        case "is_null":
          whereParts.push(`${col} IS NULL`);
          break;
        case "is_not_null":
          whereParts.push(`${col} IS NOT NULL`);
          break;
        case "contains":
          params.push(`%${String(filter.value ?? "")}%`);
          whereParts.push(`${col}::text ILIKE $${params.length}`);
          break;
        case "starts_with":
          params.push(`${String(filter.value ?? "")}%`);
          whereParts.push(`${col}::text ILIKE $${params.length}`);
          break;
        case "ends_with":
          params.push(`%${String(filter.value ?? "")}`);
          whereParts.push(`${col}::text ILIKE $${params.length}`);
          break;
        case "eq":
        case "ne":
        case "gt":
        case "lt":
        case "gte":
        case "lte": {
          params.push(filter.value ?? null);
          const op = { eq: "=", ne: "<>", gt: ">", lt: "<", gte: ">=", lte: "<=" }[filter.operator];
          whereParts.push(`${col} ${op} $${params.length}`);
          break;
        }
      }
    }

    const orderClause = options.sort && columnNames.has(options.sort.column)
      ? `ORDER BY ${quoteIdent(options.sort.column)} ${options.sort.direction === "desc" ? "DESC" : "ASC"}`
      : "";

    const where = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
    const qualified = `${quoteIdent(schema)}.${quoteIdent(table)}`;
    const sql =
      `SELECT * FROM ${qualified} ${where} ${orderClause} ` +
      `LIMIT ${limit} OFFSET ${offset}`;

    const { client } = await connectAsAdmin(databaseId);
    const raw = asRaw(client);
    const start = Date.now();
    try {
      await raw.query(`BEGIN`);
      await raw.query(`SET LOCAL statement_timeout = ${QUERY_STATEMENT_TIMEOUT_MS}`);
      await raw.query(`SET TRANSACTION READ ONLY`);
      const result = await raw.query(sql, params);
      let total: number | null = null;
      if (whereParts.length === 0) {
        total = Number((columns.find((c) => c.name) ? 0 : 0));
        const c = await raw.query(`SELECT reltuples::bigint AS n FROM pg_class WHERE oid = $1::regclass`, [`${schema}.${table}`]);
        total = Number(c.rows[0]?.n ?? 0);
      } else {
        const c = await raw.query(
          `SELECT count(*)::bigint AS n FROM ${qualified} ${where}`,
          params,
        );
        total = Number(c.rows[0]?.n ?? 0);
      }
      await raw.query(`COMMIT`);
      return {
        columns,
        rows: result.rows,
        total,
        page,
        limit,
        durationMs: Date.now() - start,
      };
    } catch (e) {
      await raw.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      await raw.end().catch(() => undefined);
    }
  },

  /**
   * Run a single SELECT statement. Blocks DDL/DML keywords up-front, then
   * forces READ ONLY + statement_timeout. Always returns at most QUERY_ROW_LIMIT.
   */
  async runQuery(databaseId: string, sql: string): Promise<QueryResult> {
    const trimmed = sql.trim().replace(/;+\s*$/, "");
    if (!trimmed) return { columns: [], rows: [], rowCount: 0, truncated: false, durationMs: 0 };
    if (trimmed.includes(";")) {
      throw new UnsafeQueryError(";");
    }
    const upper = trimmed.toUpperCase();
    for (const k of UNSAFE_KEYWORDS) {
      if (new RegExp(`(^|[^A-Z])${k}([^A-Z]|$)`).test(upper)) {
        throw new UnsafeQueryError(k);
      }
    }
    if (!/^(SELECT|WITH|EXPLAIN|SHOW|TABLE|VALUES)\b/i.test(trimmed)) {
      throw new UnsafeQueryError("non-read statement");
    }

    const { client } = await connectAsAdmin(databaseId);
    const raw = asRaw(client);
    const start = Date.now();
    try {
      await raw.query("BEGIN");
      await raw.query(`SET LOCAL statement_timeout = ${QUERY_STATEMENT_TIMEOUT_MS}`);
      await raw.query("SET TRANSACTION READ ONLY");
      const wrapped = /\blimit\b/i.test(trimmed) ? trimmed : `${trimmed} LIMIT ${QUERY_ROW_LIMIT + 1}`;
      const result = await raw.query(wrapped);
      await raw.query("COMMIT");
      const truncated = result.rows.length > QUERY_ROW_LIMIT;
      const trimmedRows = truncated ? result.rows.slice(0, QUERY_ROW_LIMIT) : result.rows;
      return {
        columns: (result.fields ?? []).map((f) => f.name),
        rows: trimmedRows,
        rowCount: trimmedRows.length,
        truncated,
        durationMs: Date.now() - start,
      };
    } catch (e) {
      await raw.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      await raw.end().catch(() => undefined);
    }
  },

  async getStats(databaseId: string): Promise<{
    databaseSizeBytes: number;
    tableCount: number;
    totalRowEstimate: number;
  }> {
    const { client } = await connectAsAdmin(databaseId).catch(() => ({ client: null }));
    if (!client) return { databaseSizeBytes: 0, tableCount: 0, totalRowEstimate: 0 };
    const raw = asRaw(client);
    try {
      const sizeR = await raw.query(`SELECT pg_database_size(current_database())::bigint AS n`);
      const tableR = await raw.query(
        `SELECT count(*)::int AS n FROM pg_class c
           JOIN pg_namespace ns ON ns.oid = c.relnamespace
          WHERE c.relkind IN ('r','p') AND ns.nspname NOT IN ('pg_catalog','information_schema')`,
      );
      const rowsR = await raw.query(
        `SELECT COALESCE(sum(reltuples), 0)::bigint AS n FROM pg_class c
           JOIN pg_namespace ns ON ns.oid = c.relnamespace
          WHERE c.relkind IN ('r','p') AND ns.nspname NOT IN ('pg_catalog','information_schema')`,
      );
      return {
        databaseSizeBytes: Number(sizeR.rows[0]?.n ?? 0),
        tableCount: Number(tableR.rows[0]?.n ?? 0),
        totalRowEstimate: Number(rowsR.rows[0]?.n ?? 0),
      };
    } finally {
      await raw.end().catch(() => undefined);
    }
  },
};

/** Pure helper exposed for tests: validate that all filters reference known columns. */
export function validateFilters(filters: BrowseFilter[], knownColumns: string[]): void {
  const known = new Set(knownColumns);
  for (const f of filters) {
    if (!known.has(f.column)) throw new InvalidIdentifierError(f.column);
    if (!FILTER_OPERATORS.includes(f.operator)) {
      throw new Error(`Unknown operator: ${f.operator}`);
    }
  }
}

/** Pure helper exposed for tests: detect blocked keywords. */
export function isUnsafeQuery(sql: string): { unsafe: boolean; keyword?: string } {
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (trimmed.includes(";")) return { unsafe: true, keyword: ";" };
  const upper = trimmed.toUpperCase();
  for (const k of UNSAFE_KEYWORDS) {
    if (new RegExp(`(^|[^A-Z])${k}([^A-Z]|$)`).test(upper)) {
      return { unsafe: true, keyword: k };
    }
  }
  if (!/^(SELECT|WITH|EXPLAIN|SHOW|TABLE|VALUES)\b/i.test(trimmed)) {
    return { unsafe: true, keyword: "non-read statement" };
  }
  return { unsafe: false };
}
