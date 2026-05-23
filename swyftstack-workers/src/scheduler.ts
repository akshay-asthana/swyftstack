// Internal periodic scheduler. For MVP this is a simple in-process interval
// scheduler that enqueues recurring jobs; a cron/queue can replace it later.
import { enqueueJob } from "swyftstack-shared/jobs";

interface Schedule {
  type: string;
  everyMs: number;
}

const SCHEDULES: Schedule[] = [
  { type: "collect_node_metrics", everyMs: 30_000 },
  { type: "collect_app_metrics", everyMs: 60_000 },
  { type: "collect_database_metrics", everyMs: 120_000 },
  { type: "collect_storage_metrics", everyMs: 300_000 },
  { type: "collect_usage", everyMs: 60_000 },
  // Pre-aggregate raw samples into metric_rollups for fast dashboards (§1).
  { type: "rollup_metrics", everyMs: 120_000 },
  { type: "enforce_limits", everyMs: 120_000 },
  { type: "sync_storage_usage", everyMs: 300_000 },
  { type: "schedule_database_backups", everyMs: 60 * 60_000 },
  // Control-plane DB backup every 6 hours (00:00 / 06:00 / 12:00 / 18:00).
  { type: "backup_control_db", everyMs: 6 * 60 * 60_000 },
];

export function startScheduler(): void {
  for (const s of SCHEDULES) {
    const fire = () =>
      enqueueJob(s.type, { scheduled: true }).catch((e) =>
        console.error(`[scheduler] failed to enqueue ${s.type}:`, String(e)),
      );
    fire(); // run once on boot
    setInterval(fire, s.everyMs);
    console.log(`[scheduler] ${s.type} every ${s.everyMs / 1000}s`);
  }
}

// Allow running the scheduler standalone: `npm run scheduler`.
if (process.argv[1]?.endsWith("scheduler.ts") || process.argv[1]?.endsWith("scheduler.js")) {
  startScheduler();
  setInterval(() => {}, 1 << 30);
}
