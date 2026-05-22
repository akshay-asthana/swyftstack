// Postgres-backed job queue. Safe concurrent claim via a conditional update
// (optimistic lock) so multiple workers never run the same job.
import { randomUUID } from "node:crypto";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { backoffDelayMs } from "./backoff.js";

export const JOB_TYPES = [
  "deploy_app",
  "create_database",
  "backup_database",
  "restore_database",
  "collect_node_metrics",
  "discover_node_hardware",
  "collect_app_metrics",
  "collect_database_metrics",
  "collect_storage_metrics",
  "collect_usage",
  "rollup_metrics",
  "migrate_app",
  "migrate_database",
  "import_database_from_url",
  "suspend_project",
  "delete_project",
  "backup_control_db",
  "sync_storage_usage",
  "enforce_limits",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export interface EnqueueOptions {
  priority?: number;
  runAfter?: Date;
  maxAttempts?: number;
  queue?: string;
  requiredWorkerType?: string;
}

export async function enqueueJob(
  type: string,
  payload: Record<string, unknown> = {},
  opts: EnqueueOptions = {},
): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type,
      payload: payload as object,
      priority: opts.priority ?? 100,
      runAfter: opts.runAfter ?? new Date(),
      maxAttempts: opts.maxAttempts ?? 5,
      queue: opts.queue ?? "default",
      requiredWorkerType: opts.requiredWorkerType ?? null,
    },
  });
  return job.id;
}

/**
 * Atomically claim one runnable job for this worker. Uses updateMany with a
 * status guard so the claim is a single round-trip and race-free.
 */
export interface ClaimOptions {
  /** Lock TTL before a job is considered abandoned. Defaults to env fallback. */
  lockTimeoutMs?: number;
  /** Only claim jobs whose `queue` is in this list (empty = any queue). */
  queues?: string[];
  /** Worker type — claims jobs with matching/blank requiredWorkerType. */
  workerType?: string;
}

export async function claimNextJob(
  workerId: string,
  opts: ClaimOptions = {},
): Promise<{
  id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
} | null> {
  // Reclaim jobs whose lock has expired (crashed worker).
  const lockCutoff = new Date(Date.now() - (opts.lockTimeoutMs ?? env.DEFAULT_WORKER_LOCK_TIMEOUT_MS));
  await prisma.job.updateMany({
    where: { status: "running", lockedAt: { lt: lockCutoff } },
    data: { status: "retrying", lockedBy: null, lockedAt: null },
  });

  const candidate = await prisma.job.findFirst({
    where: {
      status: { in: ["queued", "retrying"] },
      runAfter: { lte: new Date() },
      ...(opts.queues && opts.queues.length ? { queue: { in: opts.queues } } : {}),
      ...(opts.workerType
        ? { OR: [{ requiredWorkerType: null }, { requiredWorkerType: opts.workerType }] }
        : {}),
    },
    orderBy: [{ priority: "asc" }, { runAfter: "asc" }],
    select: { id: true },
  });
  if (!candidate) return null;

  const claimed = await prisma.job.updateMany({
    where: { id: candidate.id, status: { in: ["queued", "retrying"] } },
    data: {
      status: "running",
      lockedBy: workerId,
      lockedAt: new Date(),
      startedAt: new Date(),
    },
  });
  if (claimed.count === 0) return null; // lost the race; caller retries

  const job = await prisma.job.findUniqueOrThrow({ where: { id: candidate.id } });
  return {
    id: job.id,
    type: job.type,
    payload: job.payload as Record<string, unknown>,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
  };
}

export async function completeJob(jobId: string, result?: unknown): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "succeeded",
      finishedAt: new Date(),
      lockedBy: null,
      lockedAt: null,
      result: (result ?? {}) as object,
      attempts: { increment: 1 },
    },
  });
}

export { backoffDelayMs } from "./backoff.js";

export async function failJob(jobId: string, error: unknown): Promise<void> {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });
  const attempts = job.attempts + 1;
  const exhausted = attempts >= job.maxAttempts;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: exhausted ? "failed" : "retrying",
      attempts,
      lockedBy: null,
      lockedAt: null,
      errorMessage: String(error),
      runAfter: exhausted ? job.runAfter : new Date(Date.now() + backoffDelayMs(attempts)),
      finishedAt: exhausted ? new Date() : null,
    },
  });
}

export async function cancelJob(jobId: string): Promise<void> {
  await prisma.job.updateMany({
    where: { id: jobId, status: { in: ["queued", "retrying", "failed"] } },
    data: { status: "cancelled", finishedAt: new Date() },
  });
}

export async function retryJob(jobId: string): Promise<void> {
  await prisma.job.updateMany({
    where: { id: jobId, status: { in: ["failed", "cancelled"] } },
    data: { status: "queued", attempts: 0, errorMessage: null, runAfter: new Date(), finishedAt: null },
  });
}

export function newWorkerId(): string {
  return `worker-${process.pid}-${randomUUID().slice(0, 8)}`;
}

export { runWorker } from "./worker.js";
export { JOB_HANDLERS } from "./handlers.js";
