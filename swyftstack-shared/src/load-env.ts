import fs from "node:fs";
import path from "node:path";

let loaded = false;

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;

  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return [key, value];
}

function findRootEnv(start: string): string | null {
  let dir = start;
  while (true) {
    const candidate = path.join(dir, ".env");
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;

  const file = findRootEnv(process.cwd());
  if (file) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) continue;
      const [key, value] = parsed;
      process.env[key] ??= value;
    }
  }

  // Prisma's schema references both DATABASE_URL and DIRECT_URL. Hosts that
  // only supply a single connection string (Vercel + Supabase pooler, etc.)
  // would otherwise crash Prisma client construction with
  // "Environment variable not found: DIRECT_URL". Fall back to DATABASE_URL
  // when blank so a single URL is enough.
  if (process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
  }
}
