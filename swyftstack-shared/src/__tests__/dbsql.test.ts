import { describe, it, expect } from "vitest";
import {
  generateCreateDatabaseSql,
  generateInDatabaseSql,
  generateRotatePasswordSql,
  deriveDbNames,
} from "../dbsql.js";

const names = { dbName: "db_project_x", dbUser: "user_project_x", password: "p@ss'word" };

describe("database permission SQL generation", () => {
  const sql = generateCreateDatabaseSql(names);

  it("creates a non-superuser role", () => {
    expect(sql).toContain("NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION");
  });

  it("revokes PUBLIC and grants only CONNECT to the project user", () => {
    expect(sql).toContain('REVOKE ALL ON DATABASE "db_project_x" FROM PUBLIC;');
    expect(sql).toContain('GRANT CONNECT ON DATABASE "db_project_x" TO "user_project_x";');
  });

  it("sets connection limit and timeouts", () => {
    expect(sql).toContain('ALTER ROLE "user_project_x" CONNECTION LIMIT 10;');
    expect(sql).toContain("statement_timeout = '30s'");
    expect(sql).toContain("idle_in_transaction_session_timeout = '60s'");
  });

  it("escapes single quotes in passwords", () => {
    expect(sql).toContain("'p@ss''word'");
  });

  it("locks down the public schema inside the DB", () => {
    const inDb = generateInDatabaseSql(names);
    expect(inDb).toContain("REVOKE ALL ON SCHEMA public FROM PUBLIC;");
    expect(inDb).toContain('ALTER SCHEMA public OWNER TO "user_project_x";');
  });

  it("rejects unsafe identifiers", () => {
    expect(() =>
      generateRotatePasswordSql('user"; DROP DATABASE x;--', "n"),
    ).toThrow(/Unsafe SQL identifier/);
  });

  it("derives unique db/user names per project", () => {
    const a = deriveDbNames("11111111-2222-3333-4444-555555555555");
    const b = deriveDbNames("11111111-2222-3333-4444-555555555555");
    expect(a.dbName).not.toBe(b.dbName);
    expect(a.dbName.startsWith("db_")).toBe(true);
    expect(a.dbUser.startsWith("user_")).toBe(true);
  });
});
