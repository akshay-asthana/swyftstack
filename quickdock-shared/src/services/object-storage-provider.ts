// ObjectStorageProviderService — object storage targets are DB-managed, never
// global STORAGE_* env vars. local_dev writes to a filesystem path stored on
// the provider row; S3-compatible providers (b2/r2/hetzner/custom) keep
// encrypted keys and are wired through the same StorageProvider interface.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { encryptSecret } from "../crypto.js";
import { audit } from "../audit.js";
import type { StorageProvider } from "./types.js";

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) total += await dirSize(full);
    else total += (await fs.stat(full)).size;
  }
  return total;
}

/**
 * Build a StorageProvider bound to a specific object_storage_providers row.
 * Only local_dev is fully implemented in the MVP; S3 providers throw a clear
 * "not wired" error so misconfiguration is loud, not silent.
 */
export async function storageProviderFor(providerId: string): Promise<StorageProvider> {
  const p = await prisma.objectStorageProvider.findUniqueOrThrow({ where: { id: providerId } });
  if (p.provider !== "local_dev") {
    // Interface-ready: a real S3 client (b2/r2/hetzner) slots in here using
    // p.endpoint / p.region / decrypted keys. Intentionally not wired in MVP.
    return makeUnwiredS3Provider(p.provider as StorageProvider["kind"]);
  }
  const root = path.resolve(p.localPath ?? "./storage-local");

  return {
    kind: "local_dev",
    async createBucketOrPrefix(bucketId: string) {
      const b = await prisma.storageBucket.findUniqueOrThrow({ where: { id: bucketId } });
      await fs.mkdir(path.join(root, b.bucketName, b.prefix ?? ""), { recursive: true });
    },
    async createCredentials(bucketId: string) {
      const accessKey = `AK${crypto.randomBytes(6).toString("hex")}`;
      const secretKey = crypto.randomBytes(18).toString("base64url");
      await prisma.storageCredential.create({
        data: { bucketId, accessKey, encryptedSecretKey: encryptSecret(secretKey), status: "active" },
      });
      return { accessKey, secretKey };
    },
    async rotateCredentials(bucketId: string) {
      await prisma.storageCredential.updateMany({
        where: { bucketId, status: "active" },
        data: { status: "rotated", rotatedAt: new Date() },
      });
      return this.createCredentials(bucketId);
    },
    async getUsage(bucketId: string) {
      const b = await prisma.storageBucket.findUniqueOrThrow({ where: { id: bucketId } });
      const storageBytes = await dirSize(path.join(root, b.bucketName, b.prefix ?? ""));
      await prisma.storageBucket.update({
        where: { id: bucketId },
        data: { currentStorageBytes: BigInt(storageBytes) },
      });
      return { storageBytes, egressBytes: Number(b.currentEgressBytes) };
    },
    async suspendBucket(bucketId: string) {
      await prisma.storageBucket.update({ where: { id: bucketId }, data: { status: "suspended" } });
    },
    async deleteBucket(bucketId: string) {
      const b = await prisma.storageBucket.findUniqueOrThrow({ where: { id: bucketId } });
      await fs.rm(path.join(root, b.bucketName, b.prefix ?? ""), { recursive: true, force: true });
      await prisma.storageBucket.update({ where: { id: bucketId }, data: { status: "deleted" } });
    },
    async uploadBackup(localPath: string, remotePath: string) {
      const dest = path.join(root, remotePath);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      const data = await fs.readFile(localPath);
      await fs.writeFile(dest, data);
      return {
        size: data.length,
        checksum: crypto.createHash("sha256").update(data).digest("hex"),
      };
    },
    async verifyObject(remotePath: string, expectedChecksum: string) {
      try {
        const data = await fs.readFile(path.join(root, remotePath));
        return crypto.createHash("sha256").update(data).digest("hex") === expectedChecksum;
      } catch {
        return false;
      }
    },
  };
}

function makeUnwiredS3Provider(kind: StorageProvider["kind"]): StorageProvider {
  const err = () => {
    throw new Error(
      `Object storage provider "${kind}" is configured but the S3 client is not wired in this MVP. ` +
        `Use a local_dev provider for development.`,
    );
  };
  return {
    kind,
    createBucketOrPrefix: err,
    createCredentials: err,
    rotateCredentials: err,
    getUsage: err,
    suspendBucket: err,
    deleteBucket: err,
    uploadBackup: err,
    verifyObject: err,
  } as unknown as StorageProvider;
}

export const objectStorageProviderService = {
  listActiveProviders() {
    return prisma.objectStorageProvider.findMany({ where: { status: "active" } });
  },

  async testProvider(providerId: string): Promise<{ ok: boolean; detail: string }> {
    const p = await prisma.objectStorageProvider.findUniqueOrThrow({ where: { id: providerId } });
    if (p.provider === "local_dev") {
      try {
        const root = path.resolve(p.localPath ?? "./storage-local");
        await fs.mkdir(root, { recursive: true });
        const probe = path.join(root, ".qd-probe");
        await fs.writeFile(probe, "ok");
        await fs.rm(probe);
        return { ok: true, detail: `local_dev path writable: ${root}` };
      } catch (e) {
        return { ok: false, detail: String(e) };
      }
    }
    return { ok: false, detail: `${p.provider} S3 client not wired in MVP` };
  },

  /** Pick an active provider (region/capacity aware) for a project. */
  async selectProviderForProject(projectId: string) {
    const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
    const providers = await prisma.objectStorageProvider.findMany({ where: { status: "active" } });
    const usable = providers.filter(
      (p) => p.maxStorageBytes == null || p.currentStorageBytes < p.maxStorageBytes,
    );
    if (usable.length === 0) return null;
    usable.sort((a, b) => {
      const ra = a.region === project.region ? 0 : 1;
      const rb = b.region === project.region ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return Number(a.currentStorageBytes - b.currentStorageBytes);
    });
    return usable[0];
  },

  async updateProviderUsage(providerId: string) {
    const buckets = await prisma.storageBucket.findMany({
      where: { objectStorageProviderId: providerId, status: { not: "deleted" } },
      select: { currentStorageBytes: true },
    });
    const total = buckets.reduce((s, b) => s + b.currentStorageBytes, BigInt(0));
    return prisma.objectStorageProvider.update({
      where: { id: providerId },
      data: { currentStorageBytes: total },
    });
  },
};
