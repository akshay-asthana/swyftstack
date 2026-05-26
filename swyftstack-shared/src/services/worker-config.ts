// WorkerConfigService — worker behaviour is DB-managed (worker_configs), with
// env DEFAULT_WORKER_* values as fallback only when no DB row exists.
import { prisma } from "../db.js";
import { env } from "../env.js";

export type WorkerType = "default" | "deploy" | "backup" | "metrics" | "migration" | "usage";

export interface ResolvedWorkerConfig {
  workerType: WorkerType;
  enabled: boolean;
  pollIntervalMs: number;
  concurrency: number;
  lockTimeoutMs: number;
  queues: string[];
  config: Record<string, unknown>;
  source: "db" | "env-default";
}

function envDefault(workerType: WorkerType): ResolvedWorkerConfig {
  return {
    workerType,
    enabled: true,
    pollIntervalMs: env.DEFAULT_WORKER_POLL_INTERVAL_MS,
    concurrency: env.DEFAULT_WORKER_CONCURRENCY,
    lockTimeoutMs: env.DEFAULT_WORKER_LOCK_TIMEOUT_MS,
    queues: [],
    config: {},
    source: "env-default",
  };
}

let cache = new Map<string, { value: ResolvedWorkerConfig; at: number }>();
const TTL_MS = 30_000;

export const workerConfigService = {
  /** DB config for a worker type, falling back to env defaults. Cached 30s. */
  async getConfig(workerType: WorkerType = "default"): Promise<ResolvedWorkerConfig> {
    const hit = cache.get(workerType);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

    let value: ResolvedWorkerConfig;
    try {
      const row = await prisma.workerConfig.findUnique({ where: { workerType } });
      value = row
        ? {
            workerType: row.workerType as WorkerType,
            enabled: row.enabled,
            pollIntervalMs: row.pollIntervalMs,
            concurrency: row.concurrency,
            lockTimeoutMs: row.lockTimeoutMs,
            queues: row.queues,
            config: (row.config as Record<string, unknown>) ?? {},
            source: "db",
          }
        : envDefault(workerType);
    } catch {
      value = envDefault(workerType); // DB unreachable -> stay up on defaults
    }
    cache.set(workerType, { value, at: Date.now() });
    return value;
  },

  /** Force the next getConfig() to hit the DB (call after admin edits). */
  invalidate(): void {
    cache = new Map();
  },

  /** Background refresh so long-running workers pick up admin changes. */
  refreshConfigPeriodically(workerType: WorkerType = "default", everyMs = TTL_MS): NodeJS.Timeout {
    return setInterval(() => {
      cache.delete(workerType);
      void this.getConfig(workerType);
    }, everyMs);
  },

  listConfigs() {
    return prisma.workerConfig.findMany({ orderBy: { workerType: "asc" } });
  },
};
