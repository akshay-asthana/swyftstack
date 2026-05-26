"use client";

// Database browser client component for the user console. Renders three tabs:
// Tables (introspection + paginated rows + filter builder), SQL runner
// (read-only), Stats. Talks to /api/db-browse for every call so the
// statement-timeout + READ ONLY guarantees live on the server.
import React, { useEffect, useMemo, useState } from "react";

type TableInfo = {
  schema: string;
  name: string;
  rowEstimate: number;
  columnCount: number;
  sizeBytes: number;
};

type ColumnInfo = {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isIndexed: boolean;
};

type BrowseResult = {
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total: number | null;
  page: number;
  limit: number;
  durationMs: number;
};

type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
  durationMs: number;
};

type Stats = {
  databaseSizeBytes: number;
  tableCount: number;
  totalRowEstimate: number;
};

type Filter = {
  column: string;
  operator:
    | "eq"
    | "ne"
    | "contains"
    | "starts_with"
    | "ends_with"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "is_null"
    | "is_not_null";
  value: string;
};

const OPERATORS: { value: Filter["operator"]; label: string; hasValue: boolean }[] = [
  { value: "eq", label: "equals", hasValue: true },
  { value: "ne", label: "not equals", hasValue: true },
  { value: "contains", label: "contains", hasValue: true },
  { value: "starts_with", label: "starts with", hasValue: true },
  { value: "ends_with", label: "ends with", hasValue: true },
  { value: "gt", label: "greater than", hasValue: true },
  { value: "lt", label: "less than", hasValue: true },
  { value: "gte", label: "greater or equal", hasValue: true },
  { value: "lte", label: "less or equal", hasValue: true },
  { value: "is_null", label: "is null", hasValue: false },
  { value: "is_not_null", label: "is not null", hasValue: false },
];

function bytes(n: number): string {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function formatCell(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

async function call<T>(action: object): Promise<T> {
  const res = await fetch("/api/db-browse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action),
  });
  if (!res.ok) {
    let body = "";
    try {
      body = (await res.json()).error;
    } catch {
      body = await res.text();
    }
    throw new Error(body || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export function DatabaseBrowser({ databaseId }: { databaseId: string }) {
  const [tab, setTab] = useState<"tables" | "sql" | "stats">("tables");
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<TableInfo | null>(null);
  const [rows, setRows] = useState<BrowseResult | null>(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sortColumn, setSortColumn] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [limit, setLimit] = useState(50);
  const [tableError, setTableError] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);

  const [sql, setSql] = useState("SELECT now() AS server_time");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [runningQuery, setRunningQuery] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingTables(true);
    setTableError(null);
    call<{ tables: TableInfo[] }>({ type: "list_tables", databaseId })
      .then((r) => {
        if (!cancelled) setTables(r.tables);
      })
      .catch((e) => {
        if (!cancelled) setTableError(String(e.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoadingTables(false);
      });
    call<Stats>({ type: "stats", databaseId })
      .then((r) => {
        if (!cancelled) setStats(r);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [databaseId]);

  const loadRows = async (target: TableInfo, opts: { page?: number } = {}) => {
    setLoadingRows(true);
    setTableError(null);
    try {
      const cleanFilters = filters
        .filter((f) => f.column)
        .map((f) => ({
          column: f.column,
          operator: f.operator,
          value: f.operator === "is_null" || f.operator === "is_not_null" ? null : f.value,
        }));
      const result = await call<BrowseResult>({
        type: "browse",
        databaseId,
        table: target.name,
        schema: target.schema,
        filters: cleanFilters,
        sort: sortColumn ? { column: sortColumn, direction: sortDirection } : undefined,
        page: opts.page ?? page,
        limit,
      });
      setRows(result);
    } catch (e) {
      setTableError(String((e as Error).message ?? e));
    } finally {
      setLoadingRows(false);
    }
  };

  const selectTable = (t: TableInfo) => {
    setSelected(t);
    setFilters([]);
    setSortColumn("");
    setPage(1);
    void loadRows(t, { page: 1 });
  };

  const totalPages = useMemo(() => {
    if (!rows || rows.total == null || rows.limit === 0) return 1;
    return Math.max(1, Math.ceil(rows.total / rows.limit));
  }, [rows]);

  const runQuery = async () => {
    setRunningQuery(true);
    setQueryError(null);
    try {
      const result = await call<QueryResult>({ type: "run_query", databaseId, sql });
      setQueryResult(result);
    } catch (e) {
      setQueryError(String((e as Error).message ?? e));
      setQueryResult(null);
    } finally {
      setRunningQuery(false);
    }
  };

  return (
    <div className="db-browser">
      <div className="ctabs" style={{ marginBottom: 14 }}>
        {(["tables", "sql", "stats"] as const).map((id) => (
          <button
            key={id}
            type="button"
            className={`ctab${tab === id ? " active" : ""}`}
            onClick={() => setTab(id)}
          >
            {id === "tables" ? "Browse" : id === "sql" ? "SQL runner" : "Stats"}
          </button>
        ))}
      </div>

      {tab === "tables" && (
        <div className="split" style={{ gap: 16 }}>
          <div className="card" style={{ minHeight: 360 }}>
            <div className="panel-title">Tables ({tables.length})</div>
            {loadingTables && <p className="small">Loading tables…</p>}
            {tableError && !selected && <div className="err">{tableError}</div>}
            {!loadingTables && tables.length === 0 && !tableError && (
              <p className="small">No tables yet, or this database is not connected to a live cluster.</p>
            )}
            <ul className="db-table-list">
              {tables.map((t) => (
                <li
                  key={`${t.schema}.${t.name}`}
                  className={selected?.name === t.name ? "active" : undefined}
                >
                  <button type="button" onClick={() => selectTable(t)}>
                    <strong>{t.name}</strong>
                    <span className="small muted">
                      {t.columnCount} cols · ~{t.rowEstimate.toLocaleString()} rows · {bytes(t.sizeBytes)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="card" style={{ minHeight: 360 }}>
            {!selected && (
              <p className="small" style={{ margin: 0 }}>
                Pick a table on the left to view its columns and rows.
              </p>
            )}
            {selected && (
              <>
                <div className="panel-title row between">
                  <span>{selected.schema}.{selected.name}</span>
                  <span className="small muted">{rows ? `${rows.durationMs}ms` : ""}</span>
                </div>
                <div className="db-filter-builder">
                  <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
                    {filters.map((f, i) => (
                      <div key={i} className="row" style={{ gap: 6 }}>
                        <select
                          value={f.column}
                          onChange={(e) =>
                            setFilters((arr) => arr.map((x, idx) => (idx === i ? { ...x, column: e.target.value } : x)))
                          }
                        >
                          <option value="">(column)</option>
                          {(rows?.columns ?? []).map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={f.operator}
                          onChange={(e) =>
                            setFilters((arr) =>
                              arr.map((x, idx) =>
                                idx === i ? { ...x, operator: e.target.value as Filter["operator"] } : x,
                              ),
                            )
                          }
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        {OPERATORS.find((op) => op.value === f.operator)?.hasValue && (
                          <input
                            value={f.value}
                            placeholder="value"
                            onChange={(e) =>
                              setFilters((arr) => arr.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))
                            }
                          />
                        )}
                        <button
                          type="button"
                          className="btn sm secondary"
                          onClick={() => setFilters((arr) => arr.filter((_, idx) => idx !== i))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="row" style={{ marginTop: 10, gap: 8 }}>
                    <button
                      type="button"
                      className="btn sm secondary"
                      onClick={() =>
                        setFilters((arr) => [...arr, { column: "", operator: "eq", value: "" }])
                      }
                    >
                      + Add filter
                    </button>
                    <select
                      value={sortColumn}
                      onChange={(e) => setSortColumn(e.target.value)}
                    >
                      <option value="">No sort</option>
                      {(rows?.columns ?? []).map((c) => (
                        <option key={c.name} value={c.name}>
                          Sort by {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={sortDirection}
                      onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")}
                      disabled={!sortColumn}
                    >
                      <option value="asc">asc</option>
                      <option value="desc">desc</option>
                    </select>
                    <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                      {[25, 50, 100, 250, 500].map((n) => (
                        <option key={n} value={n}>{n} rows</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => selected && loadRows(selected, { page: 1 })}
                      disabled={loadingRows}
                    >
                      {loadingRows ? "Loading…" : "Run"}
                    </button>
                  </div>
                </div>

                {tableError && <div className="err" style={{ marginTop: 10 }}>{tableError}</div>}

                <div className="db-table-scroll" style={{ marginTop: 12 }}>
                  <table className="dt">
                    <thead>
                      <tr>
                        {(rows?.columns ?? []).map((c) => (
                          <th key={c.name}>
                            <div>
                              <strong>{c.name}</strong>
                              {c.isPrimaryKey && <span className="tag" style={{ marginLeft: 4 }}>pk</span>}
                            </div>
                            <div className="small muted">
                              {c.dataType}{c.nullable ? " · null" : ""}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(rows?.rows ?? []).map((row, i) => (
                        <tr key={i}>
                          {(rows?.columns ?? []).map((c) => (
                            <td key={c.name}>{formatCell(row[c.name])}</td>
                          ))}
                        </tr>
                      ))}
                      {rows && rows.rows.length === 0 && (
                        <tr>
                          <td colSpan={Math.max(1, rows.columns.length)}>
                            <p className="small">No matching rows.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {rows && (
                  <div className="row between" style={{ marginTop: 10 }}>
                    <div className="small muted">
                      Page {rows.page} of {totalPages} · ~{(rows.total ?? 0).toLocaleString()} total rows
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        type="button"
                        className="btn sm secondary"
                        disabled={rows.page <= 1 || loadingRows}
                        onClick={() => {
                          const next = Math.max(1, rows.page - 1);
                          setPage(next);
                          if (selected) loadRows(selected, { page: next });
                        }}
                      >
                        ← Prev
                      </button>
                      <button
                        type="button"
                        className="btn sm secondary"
                        disabled={rows.page >= totalPages || loadingRows}
                        onClick={() => {
                          const next = Math.min(totalPages, rows.page + 1);
                          setPage(next);
                          if (selected) loadRows(selected, { page: next });
                        }}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {tab === "sql" && (
        <div className="card">
          <div className="panel-title">SQL runner (read-only)</div>
          <p className="small muted" style={{ marginTop: 0 }}>
            DDL/DML statements are blocked. Queries run inside a READ ONLY transaction with a
            5-second statement timeout, and return at most 1000 rows.
          </p>
          <textarea
            rows={8}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
          />
          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <button type="button" className="btn" onClick={runQuery} disabled={runningQuery}>
              {runningQuery ? "Running…" : "Run query"}
            </button>
            {queryResult && (
              <span className="small muted">
                {queryResult.rowCount} row{queryResult.rowCount === 1 ? "" : "s"} · {queryResult.durationMs}ms
                {queryResult.truncated ? " · truncated to first 1000 rows" : ""}
              </span>
            )}
          </div>
          {queryError && <div className="err" style={{ marginTop: 12 }}>{queryError}</div>}
          {queryResult && queryResult.columns.length > 0 && (
            <div className="db-table-scroll" style={{ marginTop: 12 }}>
              <table className="dt">
                <thead>
                  <tr>
                    {queryResult.columns.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryResult.rows.map((row, i) => (
                    <tr key={i}>
                      {queryResult.columns.map((c) => (
                        <td key={c}>{formatCell(row[c])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "stats" && (
        <div className="card">
          <div className="panel-title">Database stats</div>
          {!stats && <p className="small">No stats available.</p>}
          {stats && (
            <dl className="kv">
              <dt>Database size</dt>
              <dd>{bytes(stats.databaseSizeBytes)}</dd>
              <dt>Tables</dt>
              <dd>{stats.tableCount}</dd>
              <dt>Total row estimate</dt>
              <dd>{stats.totalRowEstimate.toLocaleString()}</dd>
              <dt>Selected table</dt>
              <dd>{selected ? `${selected.schema}.${selected.name} · ${bytes(selected.sizeBytes)} · ${selected.columnCount} columns` : "(none selected)"}</dd>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
