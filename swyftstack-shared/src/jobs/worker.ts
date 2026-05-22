// Worker run loop. Behaviour (concurrency, poll interval, lock timeout, queues)
// is loaded from worker_configs in the DB via WorkerConfigService, with env
// DEFAULT_WORKER_* as fallback. Long deploys/backups run here, not in requests.
import { claimNextJob, completeJob, failJob, newWorkerId } from "./index.js";
import { JOB_HANDLERS } from "./handlers.js";
import { workerConfigService, type WorkerType } from "../services/worker-config.js";

let stopping = false;

export function requestStop(): void {
  stopping = true;
}

async function tick(
  workerId: string,
  opts: { lockTimeoutMs: number; queues: string[]; workerType: WorkerType },
): Promise<boolean> {
  const job = await claimNextJob(workerId, {
    lockTimeoutMs: opts.lockTimeoutMs,
    queues: opts.queues,
    workerType: opts.workerType,
  });
  if (!job) return false;
  const handler = JOB_HANDLERS[job.type];
  if (!handler) {
    await failJob(job.id, `No handler for job type "${job.type}"`);
    return true;
  }
  try {
    const result = await handler(job.payload);
    await completeJob(job.id, result);
    console.log(`[worker] ${job.type} ${job.id} ✓`);
  } catch (e) {
    await failJob(job.id, e);
    console.error(`[worker] ${job.type} ${job.id} ✗ ${String(e)}`);
  }
  return true;
}

export async function runWorker(workerType: WorkerType = "default"): Promise<void> {
  const workerId = newWorkerId();
  process.on("SIGINT", requestStop);
  process.on("SIGTERM", requestStop);

  // Keep the cached config fresh so admin edits take effect without a restart.
  const refresher = workerConfigService.refreshConfigPeriodically(workerType);

  let cfg = await workerConfigService.getConfig(workerType);
  console.log(
    `[worker] ${workerId} type=${workerType} concurrency=${cfg.concurrency} ` +
      `poll=${cfg.pollIntervalMs}ms source=${cfg.source}`,
  );

  while (!stopping) {
    cfg = await workerConfigService.getConfig(workerType);
    if (!cfg.enabled) {
      await new Promise((r) => setTimeout(r, cfg.pollIntervalMs));
      continue;
    }
    const lanes = Array.from({ length: Math.max(1, cfg.concurrency) }, () =>
      tick(workerId, {
        lockTimeoutMs: cfg.lockTimeoutMs,
        queues: cfg.queues,
        workerType,
      }),
    );
    const results = await Promise.all(lanes);
    if (!results.some(Boolean)) {
      await new Promise((r) => setTimeout(r, cfg.pollIntervalMs));
    }
  }
  clearInterval(refresher);
  console.log(`[worker] ${workerId} stopped`);
}
