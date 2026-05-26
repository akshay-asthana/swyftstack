import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma, type StorageBucket } from "../db.js";
import { decryptSecret, randomSecret } from "../crypto.js";
import { env } from "../env.js";
import { audit, projectActivity } from "../audit.js";
import { enqueueJob } from "../jobs/index.js";
import { objectStorageProviderService, storageProviderForBucket } from "./storage.js";
import { provisioningPolicyService } from "./provisioning-policy.js";
import { platformSettingsService } from "./platform-settings.js";
import { planResourceService } from "./plan-resource.js";
import { reconcileProjectProvisioning } from "./project-status.js";
import { formatPublicId } from "../public-ids.js";

const GB = BigInt(1024) ** BigInt(3);
const DEFAULT_STORAGE_LIMIT = BigInt(25) * GB;
const DEFAULT_EGRESS_LIMIT = BigInt(100) * GB;

export class NoStorageProviderAvailableError extends Error {
  constructor() {
    super("No active object storage provider is available right now.");
    this.name = "NoStorageProviderAvailableError";
  }
}

export class StorageBucketLimitReachedError extends Error {
  constructor(public readonly limit: number) {
    super(`Your plan allows ${limit} storage bucket${limit === 1 ? "" : "s"}. Upgrade to add another.`);
    this.name = "StorageBucketLimitReachedError";
  }
}

export class StorageCapacityLimitReachedError extends Error {
  constructor(public readonly limitBytes: number, public readonly usedBytes: number) {
    super(`Your plan storage limit is ${limitBytes} bytes. You have used ${usedBytes} bytes.`);
    this.name = "StorageCapacityLimitReachedError";
  }
}

function slug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export function normalizeObjectKey(value: string): string {
  const key = value.replace(/\\/g, "/").replace(/^\/+/g, "").replace(/\/+/g, "/").trim();
  if (!key || key.includes("..") || key.endsWith("/")) throw new Error("Invalid object key.");
  return key;
}

async function uniqueBucketName(provider: string, baseName: string): Promise<string> {
  const base = slug(baseName) || "bucket";
  let name = base;
  let i = 2;
  while (await prisma.storageBucket.findFirst({ where: { provider, bucketName: name, prefix: null } })) {
    name = `${base}-${i++}`;
  }
  return name;
}

async function localBucketRoot(bucketId: string): Promise<string> {
  const bucket = await prisma.storageBucket.findUniqueOrThrow({
    where: { id: bucketId },
    include: { storageProvider: true },
  });
  if (!bucket.storageProvider || bucket.storageProvider.provider !== "local_dev") {
    throw new Error("Console file browser is implemented for local_dev storage providers in this MVP.");
  }
  const root = path.resolve(bucket.storageProvider.localPath ?? "./storage-local");
  return path.join(root, bucket.bucketName, bucket.prefix ?? "");
}

async function activePlanForProject(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  return planResourceService.getEffectivePlanResources({
    organizationId: project.organizationId,
    projectId,
  });
}

export async function assertStorageBucketLimit(projectId: string): Promise<void> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const effective = await activePlanForProject(projectId);
  if (!effective.features.object_storage) {
    throw new Error("Your plan does not include object storage.");
  }
  const max = effective.limits.max_storage_buckets;
  if (max == null) return;
  const count = await prisma.storageBucket.count({
    where: { project: { organizationId: project.organizationId }, status: { not: "deleted" } },
  });
  if (count >= max) throw new StorageBucketLimitReachedError(max);
}

async function assertStorageCapacity(projectId: string, additionalBytes: number): Promise<void> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const effective = await activePlanForProject(projectId);
  const max = effective.limits.max_object_storage_bytes;
  if (max == null) return;
  const buckets = await prisma.storageBucket.findMany({
    where: { project: { organizationId: project.organizationId }, status: { not: "deleted" } },
    select: { currentStorageBytes: true },
  });
  const used = buckets.reduce((sum, b) => sum + Number(b.currentStorageBytes), 0);
  if (used + additionalBytes > max) throw new StorageCapacityLimitReachedError(max, used);
}

async function selectedStorageProvider(projectId: string) {
  const decision = await provisioningPolicyService.selectTarget("object_storage");
  if (decision.chosen?.targetType === "object_storage_provider") {
    const provider = await prisma.objectStorageProvider.findUnique({
      where: { id: decision.chosen.targetId },
    });
    if (provider?.status === "active") return provider;
  }
  return objectStorageProviderService.selectProviderForProject(projectId);
}

export async function provisionStorageBucket(input: {
  projectId: string;
  bucketName: string;
  isPublic?: boolean;
  enqueue?: boolean;
}): Promise<StorageBucket> {
  await assertStorageBucketLimit(input.projectId);
  const provider = await selectedStorageProvider(input.projectId);
  if (!provider) throw new NoStorageProviderAvailableError();
  const effective = await activePlanForProject(input.projectId);
  const project = await prisma.project.findUniqueOrThrow({ where: { id: input.projectId } });
  if (["suspended", "deleted", "over_limit"].includes(project.status)) {
    throw new Error("This project cannot create resources in its current state.");
  }

  const bucket = await prisma.storageBucket.create({
    data: {
      projectId: input.projectId,
      provider: provider.provider,
      bucketName: await uniqueBucketName(provider.provider, input.bucketName),
      region: provider.region,
      status: "provisioning",
      isPublic: input.isPublic ?? false,
      storageLimitBytes: BigInt(effective.limits.max_object_storage_bytes ?? Number(DEFAULT_STORAGE_LIMIT)),
      egressLimitBytes: BigInt(effective.limits.max_egress_bytes ?? Number(DEFAULT_EGRESS_LIMIT)),
      objectStorageProviderId: provider.id,
    },
  });

  await prisma.project.update({ where: { id: input.projectId }, data: { status: "provisioning" } });
  if (input.enqueue !== false) {
    await enqueueJob("create_storage_bucket", { bucketId: bucket.id }, { priority: 40 });
  }
  return bucket;
}

export async function createStorageBucketOnProvider(bucketId: string): Promise<void> {
  const bucket = await prisma.storageBucket.findUniqueOrThrow({
    where: { id: bucketId },
    include: { project: true },
  });
  try {
    const provider = await storageProviderForBucket(bucketId);
    await provider.createBucketOrPrefix(bucketId);
    await provider.createCredentials(bucketId);
    await prisma.storageBucket.update({
      where: { id: bucketId },
      data: { status: "active", lastSyncedAt: new Date() },
    });
    await projectActivity(bucket.projectId, "storage.bucket_created", null, { bucketId });
    await audit({ actorType: "system", action: "storage.bucket_created", targetType: "bucket", targetId: bucketId });
  } catch (err) {
    await prisma.storageBucket.update({ where: { id: bucketId }, data: { status: "failed" } });
    await projectActivity(bucket.projectId, "storage.bucket_failed", null, { bucketId, error: String(err) });
    await audit({
      actorType: "system",
      action: "storage.bucket_failed",
      targetType: "bucket",
      targetId: bucketId,
      metadata: { error: String(err) },
    });
    throw err;
  } finally {
    await reconcileProjectProvisioning(bucket.projectId);
  }
}

export async function rotateStorageCredentials(bucketId: string): Promise<{ accessKey: string; secretKey: string }> {
  const bucket = await prisma.storageBucket.findUniqueOrThrow({ where: { id: bucketId } });
  const provider = await storageProviderForBucket(bucketId);
  const creds = await provider.rotateCredentials(bucketId);
  await projectActivity(bucket.projectId, "storage.credentials_rotated", null, { bucketId });
  return creds;
}

export async function storageCredential(bucketId: string): Promise<{ accessKey: string; secretKey: string } | null> {
  const cred = await prisma.storageCredential.findFirst({
    where: { bucketId, status: "active" },
    orderBy: { createdAt: "desc" },
  });
  if (!cred) return null;
  return { accessKey: cred.accessKey, secretKey: decryptSecret(cred.encryptedSecretKey) };
}

export async function storageEndpoint(bucketId: string): Promise<{
  endpoint: string;
  gatewayConfigured: boolean;
  warning?: string;
}> {
  await prisma.storageBucket.findUniqueOrThrow({ where: { id: bucketId } });
  const domains = await platformSettingsService.getDomains();
  if (domains.storage_gateway_domain) {
    return { endpoint: `https://${domains.storage_gateway_domain}`, gatewayConfigured: true };
  }
  return {
    endpoint: new URL("/api/storage", env.USERAPP_BASE_URL).toString().replace(/\/$/, ""),
    gatewayConfigured: false,
    warning: "Storage gateway is not configured. Console uploads use the Swyftstack app API in local-dev mode.",
  };
}

export async function listStorageObjects(bucketId: string, prefix = "") {
  const safePrefix = prefix.replace(/\\/g, "/").replace(/^\/+/g, "");
  return prisma.storageObject.findMany({
    where: { bucketId, key: { startsWith: safePrefix } },
    orderBy: [{ key: "asc" }],
  });
}

export async function uploadStorageObject(input: {
  bucketId: string;
  key: string;
  data: Buffer;
  contentType?: string | null;
  actorUserId?: string | null;
}) {
  const key = normalizeObjectKey(input.key);
  const bucket = await prisma.storageBucket.findUniqueOrThrow({
    where: { id: input.bucketId },
    include: { project: true },
  });
  if (bucket.status !== "active") throw new Error("Bucket is not active yet.");

  const existing = await prisma.storageObject.findUnique({
    where: { bucketId_key: { bucketId: bucket.id, key } },
  });
  const delta = input.data.length - Number(existing?.sizeBytes ?? 0);
  if (delta > 0) await assertStorageCapacity(bucket.projectId, delta);

  const root = await localBucketRoot(bucket.id);
  const dest = path.join(root, key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, input.data);
  const etag = crypto.createHash("sha256").update(input.data).digest("hex");

  await prisma.storageObject.upsert({
    where: { bucketId_key: { bucketId: bucket.id, key } },
    update: { sizeBytes: BigInt(input.data.length), contentType: input.contentType ?? null, etag },
    create: { bucketId: bucket.id, key, sizeBytes: BigInt(input.data.length), contentType: input.contentType ?? null, etag },
  });
  await refreshBucketUsage(bucket.id);
  await prisma.usageEvent.create({
    data: {
      organizationId: bucket.project.organizationId,
      userId: input.actorUserId ?? null,
      projectId: bucket.projectId,
      bucketId: bucket.id,
      usageType: "storage_network_in_bytes",
      quantity: BigInt(input.data.length),
      unit: "bytes",
      metadata: { key },
    },
  });
  await projectActivity(bucket.projectId, "storage.object_uploaded", input.actorUserId ?? null, { bucketId: bucket.id, key });
}

export async function readStorageObject(bucketId: string, keyValue: string, actorUserId?: string | null) {
  const key = normalizeObjectKey(keyValue);
  const bucket = await prisma.storageBucket.findUniqueOrThrow({
    where: { id: bucketId },
    include: { project: true },
  });
  const object = await prisma.storageObject.findUniqueOrThrow({
    where: { bucketId_key: { bucketId, key } },
  });
  const root = await localBucketRoot(bucketId);
  const data = await fs.readFile(path.join(root, key));
  await prisma.storageBucket.update({
    where: { id: bucketId },
    data: { currentEgressBytes: { increment: object.sizeBytes } },
  });
  await prisma.usageEvent.create({
    data: {
      organizationId: bucket.project.organizationId,
      userId: actorUserId ?? null,
      projectId: bucket.projectId,
      bucketId,
      usageType: "storage_network_out_bytes",
      quantity: object.sizeBytes,
      unit: "bytes",
      metadata: { key },
    },
  });
  return { data, object };
}

export async function deleteStorageObject(bucketId: string, keyValue: string, actorUserId?: string | null) {
  const key = normalizeObjectKey(keyValue);
  const bucket = await prisma.storageBucket.findUniqueOrThrow({ where: { id: bucketId } });
  const root = await localBucketRoot(bucketId);
  await fs.rm(path.join(root, key), { force: true });
  await prisma.storageObject.deleteMany({ where: { bucketId, key } });
  await refreshBucketUsage(bucketId);
  await projectActivity(bucket.projectId, "storage.object_deleted", actorUserId ?? null, { bucketId, key });
}

export async function setStorageObjectPublic(bucketId: string, keyValue: string, isPublic: boolean) {
  const key = normalizeObjectKey(keyValue);
  return prisma.storageObject.update({
    where: { bucketId_key: { bucketId, key } },
    data: { isPublic },
  });
}

export async function refreshBucketUsage(bucketId: string): Promise<void> {
  const aggregates = await prisma.storageObject.aggregate({
    where: { bucketId },
    _sum: { sizeBytes: true },
    _count: { _all: true },
  });
  await prisma.storageBucket.update({
    where: { id: bucketId },
    data: {
      currentStorageBytes: aggregates._sum.sizeBytes ?? BigInt(0),
      objectCount: BigInt(aggregates._count._all),
      lastSyncedAt: new Date(),
    },
  });
}

export function signStorageUrl(input: {
  bucketId: string;
  key: string;
  action: "download" | "upload";
  expiresInSeconds?: number;
}): string {
  const expires = Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? 900);
  const key = normalizeObjectKey(input.key);
  const publicBucketId = formatPublicId("bucket", input.bucketId);
  const payload = `${publicBucketId}:${input.action}:${expires}:${key}`;
  const sig = crypto.createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
  const url = new URL("/api/storage/signed", env.USERAPP_BASE_URL);
  url.searchParams.set("bucketId", publicBucketId);
  url.searchParams.set("key", key);
  url.searchParams.set("action", input.action);
  url.searchParams.set("expires", String(expires));
  url.searchParams.set("sig", sig);
  return url.toString();
}

export function verifySignedStorageUrl(input: {
  bucketId: string;
  key: string;
  action: "download" | "upload";
  expires: string;
  sig: string;
}): boolean {
  const expires = Number(input.expires);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const key = normalizeObjectKey(input.key);
  const payload = `${input.bucketId}:${input.action}:${expires}:${key}`;
  const expected = crypto.createHmac("sha256", env.AUTH_SECRET).update(payload).digest("base64url");
  return expected.length === input.sig.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(input.sig));
}

export function generatedStorageSecret(): string {
  return randomSecret(24);
}
