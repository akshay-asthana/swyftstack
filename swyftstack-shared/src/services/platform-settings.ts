import { prisma } from "../db.js";

export const PLATFORM_DOMAIN_KEYS = [
  "database_gateway_domain",
  "storage_gateway_domain",
  "app_domain",
  "console_domain",
] as const;

export type PlatformDomainKey = (typeof PLATFORM_DOMAIN_KEYS)[number];

export type PlatformDomains = Record<PlatformDomainKey, string>;

const DESCRIPTIONS: Record<PlatformDomainKey, string> = {
  database_gateway_domain: "Customer-facing PostgreSQL gateway host, for example db.swyftstack.com.",
  storage_gateway_domain: "Customer-facing object storage/API host, for example storage.swyftstack.com.",
  app_domain: "Default application domain, for example apps.swyftstack.com.",
  console_domain: "Customer console domain or URL, for example swyftstack.com/console.",
};

export function normalizeDomainSetting(value: string): string {
  return value.trim().replace(/^https?:\/\//i, "").replace(/\/+$/g, "").toLowerCase();
}

export function isValidDomainSetting(value: string): boolean {
  if (!value) return true;
  if (value.includes("://")) return false;
  return /^[a-z0-9][a-z0-9.-]*(?::\d+)?(?:\/[a-z0-9._~/-]*)?$/i.test(value);
}

export const platformSettingsService = {
  async getDomains(): Promise<PlatformDomains> {
    const rows = await prisma.platformSetting.findMany({
      where: { key: { in: [...PLATFORM_DOMAIN_KEYS] } },
    });
    const out = Object.fromEntries(PLATFORM_DOMAIN_KEYS.map((key) => [key, ""])) as PlatformDomains;
    for (const row of rows) out[row.key as PlatformDomainKey] = row.value;
    return out;
  },

  async setDomain(key: PlatformDomainKey, value: string, updatedBy?: string | null) {
    const normalized = normalizeDomainSetting(value);
    if (!isValidDomainSetting(normalized)) {
      throw new Error(`Invalid domain value for ${key}.`);
    }
    return prisma.platformSetting.upsert({
      where: { key },
      update: { value: normalized, updatedBy: updatedBy ?? null, description: DESCRIPTIONS[key] },
      create: { key, value: normalized, updatedBy: updatedBy ?? null, description: DESCRIPTIONS[key] },
    });
  },
};
