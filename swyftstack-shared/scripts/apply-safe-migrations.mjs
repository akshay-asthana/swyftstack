#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..");
const repoRoot = path.resolve(workspaceRoot, "..");
const envPath = path.join(repoRoot, ".env");

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n");
  }
  return trimmed;
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;
    process.env[key] = unquote(line.slice(idx + 1));
  }
}

const MIGRATIONS = [
  "20260523120000_customer_console_mvp",
  "20260524120000_cms_marketing",
  "20260524090000_notifications_zeptomail",
];

loadEnvFile(envPath);

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL or DIRECT_URL is required.");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  for (const migration of MIGRATIONS) {
    const file = path.join(workspaceRoot, "prisma", "migrations", migration, "migration.sql");
    const sql = fs.readFileSync(file, "utf8");
    process.stdout.write(`Applying ${migration}... `);
    await client.query(sql);
    process.stdout.write("ok\n");
  }
  console.log("Safe schema repair complete.");
} catch (err) {
  console.error("Safe schema repair failed:");
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
