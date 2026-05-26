#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
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

function prismaBin() {
  const suffix = process.platform === "win32" ? ".cmd" : "";
  const candidates = [
    path.join(workspaceRoot, "node_modules", ".bin", `prisma${suffix}`),
    path.join(repoRoot, "node_modules", ".bin", `prisma${suffix}`),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    console.error("Could not find local Prisma CLI. Run npm install first.");
    process.exit(1);
  }
  return found;
}

loadEnvFile(envPath);

const child = spawn(prismaBin(), process.argv.slice(2), {
  cwd: workspaceRoot,
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
