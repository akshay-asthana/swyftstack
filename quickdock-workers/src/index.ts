// Long-running worker/orchestrator process. Runs the job loop AND an internal
// scheduler that enqueues periodic jobs. Worker behaviour is read from the
// control DB (worker_configs) via WorkerConfigService — not env vars.
//
// Optionally set WORKER_TYPE to run a specialised worker
// (default | deploy | backup | metrics | migration | usage).
import { runWorker } from "quickdock-shared/jobs";
import type { WorkerType } from "quickdock-shared/services";
import { startScheduler } from "./scheduler.js";

const workerType = (process.env.WORKER_TYPE as WorkerType) || "default";

async function main() {
  if (workerType === "default") startScheduler(); // one scheduler per deployment
  await runWorker(workerType);
}

main().catch((e) => {
  console.error("[workers] fatal:", e);
  process.exit(1);
});
