import { describe, expect, it } from "vitest";
import { DATABASE_IMPORT_STATUSES } from "../constants.js";
import { resolveLimit } from "../limits.js";
import { maskDbUrl } from "../services/database-import.js";
import {
  normalizeObjectKey,
  signStorageUrl,
  verifySignedStorageUrl,
} from "../services/customer-storage.js";

describe("customer console MVP primitives", () => {
  it("resolves the storage bucket plan limit", () => {
    expect(resolveLimit("max_storage_buckets", 1, [], { organizationId: "org" })).toBe(1);
    expect(
      resolveLimit(
        "max_storage_buckets",
        1,
        [{ scopeType: "organization", scopeId: "org", limitKey: "max_storage_buckets", limitValue: 3 }],
        { organizationId: "org" },
      ),
    ).toBe(3);
  });

  it("includes production import progress states", () => {
    expect(DATABASE_IMPORT_STATUSES).toEqual([
      "queued",
      "testing_connection",
      "estimating_size",
      "creating_target",
      "dumping",
      "uploading_dump_optional",
      "restoring",
      "verifying",
      "switching",
      "completed",
      "failed",
    ]);
  });

  it("masks database credentials in import logs", () => {
    expect(maskDbUrl("postgresql://alice:secret@db.example.com:5432/app")).toBe(
      "postgresql://alice:***@db.example.com:5432/app",
    );
    expect(maskDbUrl("host=db.example.com user=alice password=secret")).toBe(
      "host=db.example.com user=alice password=***",
    );
  });

  it("normalizes storage object keys and rejects traversal", () => {
    expect(normalizeObjectKey("/folder//file.txt")).toBe("folder/file.txt");
    expect(() => normalizeObjectKey("../secret.txt")).toThrow(/Invalid object key/);
  });

  it("creates verifiable signed storage URLs", () => {
    const signed = signStorageUrl({
      bucketId: "11111111-1111-4111-8111-111111111111",
      key: "folder/file.txt",
      action: "download",
      expiresInSeconds: 60,
    });
    const url = new URL(signed);
    expect(
      verifySignedStorageUrl({
        bucketId: url.searchParams.get("bucketId") ?? "",
        key: url.searchParams.get("key") ?? "",
        action: "download",
        expires: url.searchParams.get("expires") ?? "",
        sig: url.searchParams.get("sig") ?? "",
      }),
    ).toBe(true);
    expect(
      verifySignedStorageUrl({
        bucketId: url.searchParams.get("bucketId") ?? "",
        key: "folder/other.txt",
        action: "download",
        expires: url.searchParams.get("expires") ?? "",
        sig: url.searchParams.get("sig") ?? "",
      }),
    ).toBe(false);
  });
});
