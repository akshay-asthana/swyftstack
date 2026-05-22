// Generates the SQL used to provision an isolated customer Postgres database.
// Enforces architecture §10: no superuser/createdb/createrole, connection limit,
// statement + idle-transaction timeouts, locked-down public schema.
// Pure string generation — unit-testable without a live Postgres.

export interface DbProvisionNames {
  dbName: string; // e.g. db_project_<short>
  dbUser: string; // e.g. user_project_<short>
  password: string;
  connectionLimit?: number;
  statementTimeout?: string; // e.g. '30s'
  idleTxnTimeout?: string; // e.g. '60s'
}

function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
    throw new Error(`Unsafe SQL identifier: ${name}`);
  }
  return `"${name}"`;
}

function literal(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** SQL run on the shared Postgres as an admin role (not superuser-granting). */
export function generateCreateDatabaseSql(n: DbProvisionNames): string {
  const db = ident(n.dbName);
  const user = ident(n.dbUser);
  const connLimit = n.connectionLimit ?? 10;
  const stmt = n.statementTimeout ?? "30s";
  const idle = n.idleTxnTimeout ?? "60s";
  return [
    `CREATE DATABASE ${db};`,
    `CREATE USER ${user} WITH PASSWORD ${literal(n.password)} NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;`,
    `REVOKE ALL ON DATABASE ${db} FROM PUBLIC;`,
    `GRANT CONNECT ON DATABASE ${db} TO ${user};`,
    `ALTER ROLE ${user} CONNECTION LIMIT ${connLimit};`,
    `ALTER ROLE ${user} SET statement_timeout = ${literal(stmt)};`,
    `ALTER ROLE ${user} SET idle_in_transaction_session_timeout = ${literal(idle)};`,
  ].join("\n");
}

/** SQL run while connected *inside* the freshly created database. */
export function generateInDatabaseSql(n: DbProvisionNames): string {
  const user = ident(n.dbUser);
  return [
    `REVOKE ALL ON SCHEMA public FROM PUBLIC;`,
    `GRANT USAGE, CREATE ON SCHEMA public TO ${user};`,
    `ALTER SCHEMA public OWNER TO ${user};`,
  ].join("\n");
}

export function generateRotatePasswordSql(dbUser: string, newPassword: string): string {
  return `ALTER ROLE ${ident(dbUser)} WITH PASSWORD ${literal(newPassword)};`;
}

export function generateDropDatabaseSql(n: Pick<DbProvisionNames, "dbName" | "dbUser">): string {
  return [
    `REVOKE ALL ON DATABASE ${ident(n.dbName)} FROM ${ident(n.dbUser)};`,
    `DROP DATABASE IF EXISTS ${ident(n.dbName)} WITH (FORCE);`,
    `DROP ROLE IF EXISTS ${ident(n.dbUser)};`,
  ].join("\n");
}

export function generateSuspendSql(dbUser: string): string {
  // Block new connections without dropping data.
  return `ALTER ROLE ${ident(dbUser)} WITH NOLOGIN;`;
}

/**
 * Builds the isolation test described in §10: "user_a cannot connect to db_b".
 * Returns a connection string that SHOULD fail to authorize/connect.
 */
export function crossTenantProbe(
  host: string,
  port: string | number,
  userA: string,
  passwordA: string,
  dbB: string,
): string {
  return `postgresql://${encodeURIComponent(userA)}:${encodeURIComponent(passwordA)}@${host}:${port}/${dbB}`;
}

let counter = 0;
/** Deterministic-ish, collision-resistant names from a project id. */
export function deriveDbNames(projectId: string): { dbName: string; dbUser: string } {
  const short = projectId.replace(/-/g, "").slice(0, 12).toLowerCase();
  const suffix = (Date.now().toString(36) + (counter++).toString(36)).slice(-6);
  return { dbName: `db_${short}_${suffix}`, dbUser: `user_${short}_${suffix}` };
}
