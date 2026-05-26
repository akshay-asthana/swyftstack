// User-console database browser API. Read-only — all backends enforce a
// short statement_timeout and a READ ONLY transaction. Project membership
// is enforced here; the service does the introspection/parameterised SQL.
import {
  prisma,
  projectActivity,
  databaseBrowserService,
  validateFilters,
  FILTER_OPERATORS,
  type BrowseFilter,
  type FilterOperator,
  UnsafeQueryError,
  DatabaseUnavailableError,
  InvalidIdentifierError,
  uuidFromPublicId,
} from "swyftstack-shared";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

async function authoriseDatabase(databaseId: string, userId: string) {
  const db = await prisma.database.findUnique({
    where: { id: databaseId },
    include: { project: { include: { members: { where: { userId } } } } },
  });
  if (!db || db.project.members.length === 0) return null;
  return db;
}

type Action =
  | { type: "list_tables"; databaseId: string }
  | { type: "describe_table"; databaseId: string; table: string; schema?: string }
  | {
      type: "browse";
      databaseId: string;
      table: string;
      schema?: string;
      filters?: BrowseFilter[];
      sort?: { column: string; direction: "asc" | "desc" };
      page?: number;
      limit?: number;
    }
  | { type: "run_query"; databaseId: string; sql: string }
  | { type: "stats"; databaseId: string };

function normalizeFilters(input: unknown): BrowseFilter[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw) => {
    const r = raw as Record<string, unknown>;
    const operator = String(r.operator ?? "");
    if (!(FILTER_OPERATORS as readonly string[]).includes(operator)) {
      throw new InvalidIdentifierError(`operator:${operator}`);
    }
    return {
      column: String(r.column ?? ""),
      operator: operator as FilterOperator,
      value: r.value === undefined ? null : (r.value as string | number | null),
    };
  });
}

function errorResponse(e: unknown) {
  if (e instanceof UnsafeQueryError) return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  if (e instanceof DatabaseUnavailableError) return new Response(JSON.stringify({ error: e.message }), { status: 503 });
  if (e instanceof InvalidIdentifierError) return new Response(JSON.stringify({ error: e.message }), { status: 400 });
  return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500 });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  let body: Action;
  try {
    body = (await req.json()) as Action;
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  if (!body?.databaseId) return new Response("Missing databaseId", { status: 400 });
  const databaseId = uuidFromPublicId(body.databaseId, "database");
  const db = await authoriseDatabase(databaseId, user.id);
  if (!db) return new Response("Not found", { status: 404 });

  try {
    if (body.type === "list_tables") {
      const tables = await databaseBrowserService.listTables(databaseId);
      return Response.json({ tables });
    }
    if (body.type === "describe_table") {
      const columns = await databaseBrowserService.describeTable(
        databaseId,
        body.table,
        body.schema,
      );
      return Response.json({ columns });
    }
    if (body.type === "browse") {
      const filters = normalizeFilters(body.filters);
      const columns = await databaseBrowserService.describeTable(
        databaseId,
        body.table,
        body.schema,
      );
      validateFilters(filters, columns.map((c) => c.name));
      const result = await databaseBrowserService.browseTable(
        databaseId,
        body.table,
        { filters, sort: body.sort, page: body.page, limit: body.limit },
        body.schema,
      );
      return Response.json(result);
    }
    if (body.type === "run_query") {
      const result = await databaseBrowserService.runQuery(databaseId, body.sql);
      await projectActivity(db.projectId, "database.query_executed", user.id, {
        databaseId: db.id,
        rowCount: result.rowCount,
        durationMs: result.durationMs,
      });
      return Response.json(result);
    }
    if (body.type === "stats") {
      const stats = await databaseBrowserService.getStats(databaseId);
      return Response.json(stats);
    }
    return new Response("Unknown action", { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}
