import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma, type Node } from "../db.js";
import { decryptSecret } from "../crypto.js";

const MAX_LOG_CHARS = 12_000;
const SSH_TIMEOUT_MS = 15_000;

export type SshResult = {
  ok: boolean;
  exitCode: number | null;
  output: string;
  error: string;
  durationMs: number;
};

type NodeTarget = {
  mode: "local" | "ssh";
  host: string;
  port: number;
  user: string;
  privateKeyEncrypted: string | null;
};

function truncate(value: string, max = MAX_LOG_CHARS): string {
  return value.length > max ? `${value.slice(0, max)}\n... truncated ...` : value;
}

function targetForNode(
  node: Pick<Node, "connectionMode" | "sshHost" | "publicIp" | "sshPort" | "sshUser" | "sshPrivateKeyEncrypted">,
): NodeTarget {
  if (node.connectionMode === "local") {
    return { mode: "local", host: "local", port: 0, user: "local", privateKeyEncrypted: null };
  }
  const host = node.sshHost || node.publicIp;
  if (!host) throw new Error("Node is missing SSH host/public IP.");
  if (!node.sshUser) throw new Error("Node is missing SSH user.");
  if (!node.sshPrivateKeyEncrypted) throw new Error("Node is missing an SSH private key.");
  const port = Number(node.sshPort || 22);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Node has an invalid SSH port.");
  }
  return { mode: "ssh", host, port, user: node.sshUser, privateKeyEncrypted: node.sshPrivateKeyEncrypted };
}

async function tempKeyFile(encryptedKey: string): Promise<{ dir: string; file: string }> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "quickdock-ssh-"));
  const file = path.join(dir, "id_key");
  await fs.writeFile(file, decryptSecret(encryptedKey), { mode: 0o600 });
  await fs.chmod(file, 0o600);
  return { dir, file };
}

function sshArgs(target: NodeTarget, keyPath: string, command: string): string[] {
  const args = [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=8",
    "-o",
    "ServerAliveInterval=5",
    "-o",
    "ServerAliveCountMax=1",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-p",
    String(target.port),
    "-i",
    keyPath,
  ];
  args.push(`${target.user}@${target.host}`, command);
  return args;
}

async function runSsh(node: Node, command: string): Promise<SshResult> {
  const target = targetForNode(node);
  const started = Date.now();
  let key: { dir: string; file: string } | null = null;

  if (target.mode === "local") {
    return new Promise((resolve) => {
      execFile(
        "sh",
        ["-lc", command],
        { timeout: SSH_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
        (err, stdout, stderr) => {
          const exitCode =
            err && typeof (err as { code?: unknown }).code === "number"
              ? ((err as { code: number }).code)
              : err
                ? 1
                : 0;
          resolve({
            ok: !err,
            exitCode,
            output: truncate(stdout.toString()),
            error: truncate(stderr.toString() || (err ? String(err.message) : "")),
            durationMs: Date.now() - started,
          });
        },
      );
    });
  }

  key = await tempKeyFile(target.privateKeyEncrypted!);

  return new Promise((resolve) => {
    execFile(
      "ssh",
      sshArgs(target, key.file, command),
      { timeout: SSH_TIMEOUT_MS, maxBuffer: 1024 * 1024 },
      async (err, stdout, stderr) => {
        if (key) await fs.rm(key.dir, { recursive: true, force: true });
        const exitCode =
          err && typeof (err as { code?: unknown }).code === "number"
            ? ((err as { code: number }).code)
            : err
              ? 1
              : 0;
        resolve({
          ok: !err,
          exitCode,
          output: truncate(stdout.toString()),
          error: truncate(stderr.toString() || (err ? String(err.message) : "")),
          durationMs: Date.now() - started,
        });
      },
    );
  });
}

async function recordLog(
  nodeId: string,
  action: string,
  command: string,
  result: SshResult,
  opts: { updateStatus?: boolean } = {},
) {
  await prisma.nodeConnectionLog.create({
    data: {
      nodeId,
      action,
      command,
      status: result.ok ? "succeeded" : "failed",
      exitCode: result.exitCode,
      output: result.output,
      error: result.error,
      durationMs: result.durationMs,
    },
  });
  // Discovery/onboarding probes leave node.status untouched (the onboarding
  // flow owns the transition to `active`); everything else updates health.
  await prisma.node.update({
    where: { id: nodeId },
    data: {
      lastConnectionStatus: result.ok ? "connected" : "failed",
      lastConnectionError: result.ok ? null : result.error || "SSH command failed.",
      lastConnectionAt: new Date(),
      lastHeartbeatAt: result.ok ? new Date() : undefined,
      ...(opts.updateStatus === false ? {} : { status: result.ok ? "active" : "degraded" }),
    },
  });
}

/**
 * Run an arbitrary probe command on a node, record it in node_connection_logs,
 * and return the raw result. Used by the discovery + metrics collectors.
 * `updateStatus: false` keeps node.status unchanged (onboarding probes).
 */
export async function runNodeProbe(
  nodeId: string,
  action: string,
  command: string,
  opts: { updateStatus?: boolean } = {},
): Promise<SshResult> {
  const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
  const result = await runSsh(node, command);
  await recordLog(node.id, action, command, result, opts);
  return result;
}

function numberAfter(prefix: string, output: string): number | null {
  const line = output.split("\n").find((l) => l.startsWith(prefix));
  if (!line) return null;
  const value = Number(line.slice(prefix.length).trim().split(/\s+/)[0]);
  return Number.isFinite(value) ? value : null;
}

function memFrom(output: string): { total: bigint | null; used: bigint | null } {
  const line = output.split("\n").find((l) => l.startsWith("__QD_MEM__ "));
  if (!line) return { total: null, used: null };
  const [, total, , used] = line.trim().split(/\s+/);
  return {
    total: total ? BigInt(Math.round(Number(total))) : null,
    used: used ? BigInt(Math.round(Number(used))) : null,
  };
}

function diskFrom(output: string): { total: bigint | null; used: bigint | null } {
  const line = output.split("\n").find((l) => l.startsWith("__QD_DISK__ "));
  if (!line) return { total: null, used: null };
  const [, total, used] = line.trim().split(/\s+/);
  return {
    total: total ? BigInt(Math.round(Number(total))) : null,
    used: used ? BigInt(Math.round(Number(used))) : null,
  };
}

const PROBE_COMMAND = `
set -u
echo "__QD_HOSTNAME__ $(hostname 2>/dev/null || true)"
echo "__QD_UNAME__ $(uname -srmo 2>/dev/null || uname -a 2>/dev/null || true)"
echo "__QD_CPU__ $(nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1)"
if [ -r /proc/loadavg ]; then awk '{print "__QD_LOAD__ "$1" "$2" "$3}' /proc/loadavg; fi
if [ -r /proc/meminfo ]; then awk '/MemTotal/ {t=$2*1024} /MemAvailable/ {a=$2*1024} END {printf "__QD_MEM__ %.0f %.0f %.0f\\n", t, a, t-a}' /proc/meminfo; fi
df -PB1 / 2>/dev/null | awk 'NR==2{print "__QD_DISK__ "$2" "$3" "$4" "$5}'
if [ -r /proc/uptime ]; then awk '{print "__QD_UPTIME__ " int($1)}' /proc/uptime; fi
echo "__QD_PROCESSES__"
ps -eo pid,comm,%cpu,%mem --sort=-%cpu 2>/dev/null | head -n 12 || true
echo "__QD_PORTS__"
(ss -tulpn 2>/dev/null || netstat -tulpn 2>/dev/null || true) | head -n 25
`.trim();

const LOG_COMMAND = `
(journalctl -n 120 --no-pager 2>/dev/null || tail -n 120 /var/log/syslog 2>/dev/null || tail -n 120 /var/log/messages 2>/dev/null || echo "No readable system logs found.")
`.trim();

const SERVICES_COMMAND = `
(systemctl --type=service --state=running --no-pager --plain 2>/dev/null || ps -eo pid,comm,%cpu,%mem --sort=-%cpu 2>/dev/null | head -n 40 || true)
`.trim();

export const sshNodeService = {
  async testConnection(nodeId: string) {
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    const command = "echo __QD_CONNECTED__ && hostname && uptime";
    const result = await runSsh(node, command);
    await recordLog(node.id, "test_connection", command, result);
    return result;
  },

  async collectMetrics(nodeId: string) {
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    const result = await runSsh(node, PROBE_COMMAND);
    await recordLog(node.id, "collect_metrics", PROBE_COMMAND, result);
    if (!result.ok) return result;

    const cpuCores = numberAfter("__QD_CPU__ ", result.output) ?? Number(node.cpuCores || 1);
    const load1 = numberAfter("__QD_LOAD__ ", result.output) ?? 0;
    const mem = memFrom(result.output);
    const disk = diskFrom(result.output);
    const cpuUsagePercent = Math.min(100, (load1 / Math.max(cpuCores, 1)) * 100);

    await prisma.nodeMetric.create({
      data: {
        nodeId,
        cpuUsagePercent,
        ramUsedBytes: mem.used ?? BigInt(0),
        diskUsedBytes: disk.used ?? BigInt(0),
        networkRxBytes: BigInt(0),
        networkTxBytes: BigInt(0),
      },
    });
    await prisma.node.update({
      where: { id: nodeId },
      data: {
        cpuCores,
        ramBytes: mem.total ?? undefined,
        diskBytes: disk.total ?? undefined,
        agentVersion: result.output.split("\n").find((l) => l.startsWith("__QD_UNAME__ "))?.slice(12) ?? undefined,
      },
    });
    return result;
  },

  async collectLogs(nodeId: string) {
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    const result = await runSsh(node, LOG_COMMAND);
    await recordLog(node.id, "collect_logs", LOG_COMMAND, result);
    return result;
  },

  async listRunningServices(nodeId: string) {
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    const result = await runSsh(node, SERVICES_COMMAND);
    await recordLog(node.id, "list_services", SERVICES_COMMAND, result);
    return result;
  },

  async runCommand(nodeId: string, command: string) {
    const node = await prisma.node.findUniqueOrThrow({ where: { id: nodeId } });
    const result = await runSsh(node, command);
    await recordLog(node.id, "run_command", command, result);
    return result;
  },
};
