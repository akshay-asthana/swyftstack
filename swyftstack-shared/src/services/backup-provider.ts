// BackupProviderService — backup targets are DB-managed, never global
// BACKUP_* env vars. Resolves a target for a database/project (project/plan
// default → global default), uploads, and verifies by checksum.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { encryptSecret } from "../crypto.js";
import { audit } from "../audit.js";

function rootFor(provider: { localPath: string | null }): string {
  return path.resolve(provider.localPath ?? "./backups-local");
}

export const backupProviderService = {
  listActiveProviders() {
    return prisma.backupStorageProvider.findMany({ where: { status: "active" } });
  },

  async getDefaultProvider() {
    return (
      (await prisma.backupStorageProvider.findFirst({
        where: { status: "active", isDefault: true },
      })) ??
      (await prisma.backupStorageProvider.findFirst({ where: { status: "active" } }))
    );
  },

  /**
   * Resolve the backup target for a database. Order: explicit project/plan
   * default (future) → global default provider.
   */
  async selectBackupProvider(_databaseId?: string) {
    const provider = await this.getDefaultProvider();
    if (!provider) throw new Error("No active backup storage provider configured");
    return provider;
  },

  async testProvider(providerId: string): Promise<{ ok: boolean; detail: string }> {
    const p = await prisma.backupStorageProvider.findUniqueOrThrow({ where: { id: providerId } });
    if (p.provider === "local_dev") {
      try {
        const root = rootFor(p);
        await fs.mkdir(root, { recursive: true });
        const probe = path.join(root, ".swyftstack-probe");
        await fs.writeFile(probe, "ok");
        const back = await fs.readFile(probe, "utf8");
        await fs.rm(probe);
        await audit({
          actorType: "admin",
          action: "backup_provider.test_ok",
          targetType: "backup_storage_provider",
          targetId: providerId,
        });
        return { ok: back === "ok", detail: `local_dev path writable: ${root}` };
      } catch (e) {
        return { ok: false, detail: String(e) };
      }
    }
    return { ok: false, detail: `${p.provider} backup client not wired in MVP` };
  },

  /** Upload a local file to the provider; returns size + sha256 checksum. */
  async uploadBackup(
    providerId: string,
    localPath: string,
    remotePath: string,
  ): Promise<{ size: number; checksum: string }> {
    const p = await prisma.backupStorageProvider.findUniqueOrThrow({ where: { id: providerId } });
    if (p.provider !== "local_dev") {
      throw new Error(`Backup provider "${p.provider}" not wired in MVP (use local_dev).`);
    }
    const dest = path.join(rootFor(p), p.prefix ?? "", remotePath);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const data = await fs.readFile(localPath);
    await fs.writeFile(dest, data);
    return { size: data.length, checksum: crypto.createHash("sha256").update(data).digest("hex") };
  },

  async verifyBackup(
    providerId: string,
    remotePath: string,
    expectedChecksum: string,
  ): Promise<boolean> {
    const p = await prisma.backupStorageProvider.findUniqueOrThrow({ where: { id: providerId } });
    if (p.provider !== "local_dev") return false;
    try {
      const data = await fs.readFile(path.join(rootFor(p), p.prefix ?? "", remotePath));
      return crypto.createHash("sha256").update(data).digest("hex") === expectedChecksum;
    } catch {
      return false;
    }
  },

  async createProvider(input: {
    name: string;
    provider: string;
    localPath?: string;
    endpoint?: string;
    region?: string;
    bucket?: string;
    prefix?: string;
    accessKey?: string;
    secretKey?: string;
    isDefault?: boolean;
    retentionPolicy?: Record<string, unknown>;
  }) {
    return prisma.backupStorageProvider.create({
      data: {
        name: input.name,
        provider: input.provider,
        localPath: input.localPath,
        endpoint: input.endpoint,
        region: input.region,
        bucket: input.bucket,
        prefix: input.prefix,
        accessKeyEncrypted: input.accessKey ? encryptSecret(input.accessKey) : null,
        secretKeyEncrypted: input.secretKey ? encryptSecret(input.secretKey) : null,
        isDefault: input.isDefault ?? false,
        retentionPolicy: (input.retentionPolicy ?? {}) as object,
        status: "active",
      },
    });
  },
};
