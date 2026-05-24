// Platform bucket — Swyftstack-owned object storage for CMS images and other
// non-customer assets. Sits on top of the existing customer-storage
// pipeline so all the safety/usage tracking still applies. The bucket is
// just a regular `storage_buckets` row whose `project_id` points to a
// platform-owned organisation/project. We never bill customers for it.
//
// Settings used (under `platform_settings`):
//   - platform_bucket_provider_id  (uuid)
//   - platform_bucket_name         (text, e.g. "platform")
//   - platform_bucket_prefix       (text, default "platform")
//   - platform_bucket_id           (uuid, set after first create)
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { uploadStorageObject, signStorageUrl } from "./customer-storage.js";

const SETTINGS = {
  providerId: "platform_bucket_provider_id",
  bucketName: "platform_bucket_name",
  bucketPrefix: "platform_bucket_prefix",
  bucketId: "platform_bucket_id",
};

const DEFAULT_BUCKET_NAME = "platform";
const DEFAULT_PREFIX = "platform";

export class PlatformBucketNotConfiguredError extends Error {
  constructor() {
    super(
      "Platform bucket is not configured. Set platform_bucket_provider_id, " +
        "platform_bucket_name and platform_bucket_prefix in admin settings.",
    );
    this.name = "PlatformBucketNotConfiguredError";
  }
}

async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

async function setSetting(key: string, value: string, updatedBy?: string | null) {
  return prisma.platformSetting.upsert({
    where: { key },
    create: { key, value, updatedBy: updatedBy ?? null },
    update: { value, updatedBy: updatedBy ?? null },
  });
}

async function platformOwnerOrg() {
  // Reuse the first organisation owned by a platform admin so we don't
  // invent a phantom org. Falls back to creating one named "__platform__".
  const admin = await prisma.user.findFirst({
    where: { isPlatformAdmin: true, status: "active" },
    orderBy: { createdAt: "asc" },
  });
  const existing = await prisma.organization.findFirst({
    where: { name: "__platform__" },
  });
  if (existing) return existing;
  return prisma.organization.create({
    data: {
      name: "__platform__",
      ownerUserId: admin?.id ?? null,
    },
  });
}

async function platformProject(orgId: string) {
  const existing = await prisma.project.findFirst({
    where: { organizationId: orgId, slug: "platform" },
  });
  if (existing) return existing;
  return prisma.project.create({
    data: {
      organizationId: orgId,
      name: "Platform",
      slug: "platform",
      status: "active",
    },
  });
}

/**
 * Resolve (and lazy-create) the platform bucket row. Throws if no provider
 * is configured — never silently creates a customer-owned bucket.
 */
export async function ensurePlatformBucket(): Promise<{
  bucketId: string;
  bucketName: string;
  prefix: string;
}> {
  const providerId = await getSetting(SETTINGS.providerId);
  if (!providerId) throw new PlatformBucketNotConfiguredError();

  const bucketName = (await getSetting(SETTINGS.bucketName)) || DEFAULT_BUCKET_NAME;
  const prefix = (await getSetting(SETTINGS.bucketPrefix)) || DEFAULT_PREFIX;
  const existingId = await getSetting(SETTINGS.bucketId);
  if (existingId) {
    const found = await prisma.storageBucket.findUnique({ where: { id: existingId } });
    if (found && found.status !== "deleted") {
      return { bucketId: found.id, bucketName: found.bucketName, prefix: found.prefix ?? prefix };
    }
  }

  const provider = await prisma.objectStorageProvider.findUnique({ where: { id: providerId } });
  if (!provider) throw new PlatformBucketNotConfiguredError();

  const org = await platformOwnerOrg();
  const project = await platformProject(org.id);

  const bucket = await prisma.storageBucket.create({
    data: {
      projectId: project.id,
      provider: provider.provider,
      bucketName,
      prefix,
      objectStorageProviderId: provider.id,
      storageLimitBytes: BigInt(50) * BigInt(1024) ** BigInt(3), // 50GB cap
      egressLimitBytes: BigInt(200) * BigInt(1024) ** BigInt(3),
      isPublic: true,
      status: "active",
      region: provider.region ?? null,
    },
  });
  // Materialise the bucket folder on disk for local_dev.
  const { storageProviderFor } = await import("./object-storage-provider.js");
  const sp = await storageProviderFor(provider.id);
  await sp.createBucketOrPrefix(bucket.id);
  await setSetting(SETTINGS.bucketId, bucket.id);

  return { bucketId: bucket.id, bucketName: bucket.bucketName, prefix: bucket.prefix ?? prefix };
}

export function platformAssetKey(filename: string, kind: "marketing_data" | "email_assets" = "marketing_data"): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const uuid = crypto.randomUUID();
  const safe = filename
    .replace(/\.{2,}/g, ".")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 80);
  return path.posix.join(kind, String(yyyy), mm, `${uuid}-${safe || "file"}`);
}

export const platformBucketService = {
  ensurePlatformBucket,
  platformAssetKey,
  async configure(input: {
    providerId: string;
    bucketName?: string;
    prefix?: string;
    actorUserId?: string | null;
  }) {
    if (!input.providerId) throw new PlatformBucketNotConfiguredError();
    await setSetting(SETTINGS.providerId, input.providerId, input.actorUserId);
    if (input.bucketName) await setSetting(SETTINGS.bucketName, input.bucketName, input.actorUserId);
    if (input.prefix) await setSetting(SETTINGS.bucketPrefix, input.prefix, input.actorUserId);
    // Reset cached bucket id — ensurePlatformBucket will recreate as needed.
    await prisma.platformSetting.deleteMany({ where: { key: SETTINGS.bucketId } });
    return ensurePlatformBucket();
  },
  async settings() {
    const [providerId, bucketName, prefix, bucketId] = await Promise.all([
      getSetting(SETTINGS.providerId),
      getSetting(SETTINGS.bucketName),
      getSetting(SETTINGS.bucketPrefix),
      getSetting(SETTINGS.bucketId),
    ]);
    return {
      providerId,
      bucketName: bucketName ?? DEFAULT_BUCKET_NAME,
      prefix: prefix ?? DEFAULT_PREFIX,
      bucketId,
    };
  },

  /**
   * Upload a marketing asset to the platform bucket and return a public URL.
   * The actual upload always routes through `uploadStorageObject` so the
   * existing storage provider abstraction handles disk/S3 writes.
   */
  async uploadMarketingAsset(input: {
    filename: string;
    data: Buffer;
    contentType?: string | null;
    actorUserId?: string | null;
  }): Promise<{ key: string; url: string; bucketId: string }> {
    const { bucketId } = await ensurePlatformBucket();
    const key = platformAssetKey(input.filename, "marketing_data");
    await uploadStorageObject({
      bucketId,
      key,
      data: input.data,
      contentType: input.contentType ?? null,
      actorUserId: input.actorUserId ?? null,
    });
    const url = signStorageUrl({ bucketId, key, action: "download", expiresInSeconds: 60 * 60 * 24 * 365 });
    return { key, url, bucketId };
  },
};
