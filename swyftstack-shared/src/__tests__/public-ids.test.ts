import { describe, expect, it } from "vitest";
import {
  PublicIdError,
  assertPublicId,
  formatPublicId,
  isPublicIdType,
  parsePublicId,
  uuidFromPublicId,
  withPublicId,
} from "../public-ids.js";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("public IDs", () => {
  it("formats stable lowercase prefixed IDs", () => {
    expect(formatPublicId("organization", UUID.toUpperCase())).toBe(`org_${UUID}`);
    expect(formatPublicId("database", UUID)).toBe(`db_${UUID}`);
    expect(formatPublicId("node", UUID)).toBe(`node_${UUID}`);
    expect(formatPublicId("user", UUID)).toBe(`user_${UUID}`);
  });

  it("parses prefixed IDs and preserves the resource type", () => {
    expect(parsePublicId(`org_${UUID}`)).toEqual({
      type: "organization",
      uuid: UUID,
      legacy: false,
    });
  });

  it("rejects malformed IDs", () => {
    expect(parsePublicId("org_not-a-uuid")).toBeNull();
    expect(parsePublicId("org-11111111-1111-4111-8111-111111111111")).toBeNull();
    expect(() => formatPublicId("organization", "not-a-uuid")).toThrow(PublicIdError);
  });

  it("rejects wrong resource types", () => {
    expect(parsePublicId(`db_${UUID}`, "organization")).toBeNull();
    expect(() => assertPublicId(`db_${UUID}`, "organization")).toThrow(PublicIdError);
    expect(isPublicIdType(`db_${UUID}`, "database")).toBe(true);
    expect(isPublicIdType(`db_${UUID}`, "organization")).toBe(false);
  });

  it("temporarily accepts legacy raw UUIDs", () => {
    expect(parsePublicId(UUID, "database")).toEqual({
      type: "database",
      uuid: UUID,
      legacy: true,
    });
    expect(uuidFromPublicId(UUID, "database")).toBe(UUID);
  });

  it("can reject legacy UUIDs when strict public IDs are required", () => {
    expect(parsePublicId(UUID, "database", { allowLegacyUuid: false })).toBeNull();
  });

  it("rewrites API resource IDs to public IDs", () => {
    expect(withPublicId("organization", { id: UUID, name: "Acme" })).toEqual({
      id: `org_${UUID}`,
      name: "Acme",
    });
  });
});
