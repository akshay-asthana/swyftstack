"use client";

// Live node monitoring (§4). Polls /api/admin/nodes/[id]/metrics every few
// seconds, redraws the charts, shows a "last updated" timestamp and a stale
// warning when metrics stop flowing.
import { useState, useEffect, useCallback } from "react";
import { AreaChart, bytes, LineChart, StatCard } from "./ui";

interface Metric {
  collectedAt: string;
  cpuUsagePercent: number | null;
  cpuLoad1: number | null;
  ramUsedBytes: number;
  ramTotalBytes: number;
  diskUsedBytes: number;
  networkRxBytes: number;
  networkTxBytes: number;
  containersRunning: number;
  containersFailed: number;
}
export interface MonitorData {
  status: string;
  lastMetricAt: string | null;
  metrics: Metric[];
}

const POLL_MS = 8_000;
const SUMMARY_POLL_MS = 30_000;
const STALE_MS = 60_000;
const BACKGROUND_FETCH_HEADERS = { "x-swyftstack-background": "1" };

function fmtAgo(s: number): string {
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function NodeMonitor({ nodeId, initial }: { nodeId: string; initial: MonitorData }) {
  const [data, setData] = useState<MonitorData>(initial);
  const [now, setNow] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/nodes/${nodeId}/metrics`, {
        cache: "no-store",
        headers: BACKGROUND_FETCH_HEADERS,
      });
      if (!res.ok) {
        setError(true);
        return;
      }
      setData((await res.json()) as MonitorData);
      setError(false);
    } catch {
      setError(true);
    }
  }, [nodeId]);

  // 1s clock so the "updated Xs ago" label stays live.
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(clock);
  }, []);

  // Poll while not paused.
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(poll, POLL_MS);
    return () => clearInterval(iv);
  }, [paused, poll]);

  const metrics = data.metrics;
  const labels = metrics.map((m) => m.collectedAt.slice(11, 16));
  const lastMs = data.lastMetricAt ? new Date(data.lastMetricAt).getTime() : 0;
  const ageS = lastMs ? Math.max(0, Math.floor((now - lastMs) / 1000)) : null;
  const stale = lastMs ? now - lastMs > STALE_MS : true;

  if (metrics.length === 0) {
    return (
      <div className="panel">
        <div className="panel-body">
          <div className="small">
            No metrics collected yet. The worker collects node metrics every 30s —
            start it with <code>npm run dev:worker</code>.
          </div>
        </div>
      </div>
    );
  }

  const chart = (title: string, points: number[], color: string) => (
    <div className="panel">
      <div className="panel-head"><span className="panel-title">{title}</span></div>
      <div className="panel-body">
        <AreaChart points={points} labels={labels} color={color} />
      </div>
    </div>
  );

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className={`badge ${stale ? "warn" : "ok"}`}>
            {ageS === null
              ? "no metrics"
              : stale
                ? `stale — updated ${fmtAgo(ageS)}`
                : `live — updated ${fmtAgo(ageS)}`}
          </span>
          {error && <span className="badge bad">poll error — retrying</span>}
          <span className="small">auto-refresh every {POLL_MS / 1000}s</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn sm secondary" onClick={() => void poll()} type="button">Refresh now</button>
          <button className="btn sm secondary" onClick={() => setPaused((p) => !p)} type="button">
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      {stale && (
        <div className="err" style={{ marginBottom: 12 }}>
          Metrics are stale (older than {STALE_MS / 1000}s). The node may be offline,
          or the metrics worker is not running.
        </div>
      )}

      <div className="split-even">
        {chart("CPU usage %", metrics.map((m) => m.cpuUsagePercent ?? 0), "#6d5ef6")}
        {chart("RAM used (GB)", metrics.map((m) => m.ramUsedBytes / 1e9), "#2563eb")}
        {chart("Disk used (GB)", metrics.map((m) => m.diskUsedBytes / 1e9), "#16a34a")}
        {chart("Load average (1m)", metrics.map((m) => m.cpuLoad1 ?? 0), "#d98e04")}
        {chart("Running containers", metrics.map((m) => m.containersRunning), "#5847e8")}
        {chart("Failed containers", metrics.map((m) => m.containersFailed), "#dc2626")}
      </div>

      <div className="panel">
        <div className="panel-head"><span className="panel-title">Network (MB, in / out)</span></div>
        <div className="panel-body">
          <LineChart
            labels={labels}
            series={[
              { name: "Inbound", color: "#16a34a", points: metrics.map((m) => m.networkRxBytes / 1e6) },
              { name: "Outbound", color: "#6d5ef6", points: metrics.map((m) => m.networkTxBytes / 1e6) },
            ]}
          />
        </div>
      </div>
    </>
  );
}

export function NodeMetricCards({ nodeId, initial }: { nodeId: string; initial: MonitorData }) {
  const [data, setData] = useState(initial);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/nodes/${nodeId}/metrics`, {
        cache: "no-store",
        headers: BACKGROUND_FETCH_HEADERS,
      });
      if (res.ok) setData((await res.json()) as MonitorData);
    } catch {
      // Keep the last known values on transient poll failures.
    }
  }, [nodeId]);

  useEffect(() => {
    const iv = setInterval(poll, SUMMARY_POLL_MS);
    return () => clearInterval(iv);
  }, [poll]);

  const latest = data.metrics[data.metrics.length - 1];

  return (
    <div className="grid compact" style={{ marginBottom: 16 }}>
      <StatCard
        icon="cpu"
        tone="violet"
        label="CPU"
        value={latest?.cpuUsagePercent != null ? `${Number(latest.cpuUsagePercent).toFixed(0)}%` : "—"}
        deltaNote={`updates every ${SUMMARY_POLL_MS / 1000}s`}
      />
      <StatCard icon="infra" tone="blue" label="RAM used" value={latest ? bytes(latest.ramUsedBytes) : "—"} />
      <StatCard icon="storage" tone="green" label="Disk used" value={latest ? bytes(latest.diskUsedBytes) : "—"} />
      <StatCard icon="apps" tone="amber" label="Containers" value={latest?.containersRunning ?? "—"} />
      <StatCard icon="alert" tone="rose" label="Failed containers" value={latest?.containersFailed ?? "—"} />
    </div>
  );
}
