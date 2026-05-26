import { describe, it, expect } from "vitest";
import {
  isUnsafeQuery,
  validateFilters,
  InvalidIdentifierError,
  FILTER_OPERATORS,
  type BrowseFilter,
} from "../services/database-browser.js";

describe("isUnsafeQuery", () => {
  it("blocks DDL keywords", () => {
    expect(isUnsafeQuery("DROP TABLE users")).toEqual({ unsafe: true, keyword: "DROP" });
    expect(isUnsafeQuery("alter table users add column x int")).toEqual({ unsafe: true, keyword: "ALTER" });
    expect(isUnsafeQuery("CREATE INDEX foo ON bar(x)")).toEqual({ unsafe: true, keyword: "CREATE" });
  });

  it("blocks DML keywords", () => {
    expect(isUnsafeQuery("UPDATE users SET name='x'")).toEqual({ unsafe: true, keyword: "UPDATE" });
    expect(isUnsafeQuery("INSERT INTO users (id) VALUES (1)")).toEqual({ unsafe: true, keyword: "INSERT" });
    expect(isUnsafeQuery("DELETE FROM users")).toEqual({ unsafe: true, keyword: "DELETE" });
    expect(isUnsafeQuery("TRUNCATE users")).toEqual({ unsafe: true, keyword: "TRUNCATE" });
  });

  it("blocks GRANT/REVOKE", () => {
    expect(isUnsafeQuery("GRANT SELECT ON users TO alice").unsafe).toBe(true);
    expect(isUnsafeQuery("REVOKE ALL ON SCHEMA public FROM bob").unsafe).toBe(true);
  });

  it("blocks compound statements", () => {
    expect(isUnsafeQuery("SELECT 1; DROP TABLE users")).toEqual({ unsafe: true, keyword: ";" });
  });

  it("blocks non-read top-level statements", () => {
    expect(isUnsafeQuery("BEGIN")).toEqual({ unsafe: true, keyword: "non-read statement" });
  });

  it("allows safe SELECT-like reads", () => {
    expect(isUnsafeQuery("SELECT 1").unsafe).toBe(false);
    expect(isUnsafeQuery("  select * from users limit 10  ").unsafe).toBe(false);
    expect(isUnsafeQuery("WITH t AS (SELECT 1) SELECT * FROM t").unsafe).toBe(false);
    expect(isUnsafeQuery("EXPLAIN SELECT 1").unsafe).toBe(false);
    expect(isUnsafeQuery("SHOW search_path").unsafe).toBe(false);
  });

  it("tolerates trailing semicolon", () => {
    expect(isUnsafeQuery("SELECT now();").unsafe).toBe(false);
  });
});

describe("validateFilters", () => {
  const knownColumns = ["id", "name", "created_at"];

  it("accepts filters whose columns are known", () => {
    const filters: BrowseFilter[] = [
      { column: "id", operator: "eq", value: "1" },
      { column: "name", operator: "contains", value: "x" },
      { column: "created_at", operator: "is_not_null" },
    ];
    expect(() => validateFilters(filters, knownColumns)).not.toThrow();
  });

  it("rejects filters with unknown column (no schema leakage)", () => {
    const filters: BrowseFilter[] = [{ column: "secret_col", operator: "eq", value: "y" }];
    expect(() => validateFilters(filters, knownColumns)).toThrowError(InvalidIdentifierError);
  });

  it("FILTER_OPERATORS lists the documented set", () => {
    expect(FILTER_OPERATORS).toContain("eq");
    expect(FILTER_OPERATORS).toContain("is_null");
    expect(FILTER_OPERATORS).toContain("is_not_null");
    expect(FILTER_OPERATORS).toContain("contains");
  });
});
