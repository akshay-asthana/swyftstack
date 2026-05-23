import React from "react";
import { Icon, type IconName } from "./icons";

const OK = ["active", "running", "live", "verified", "succeeded", "completed", "accepted", "ok", "online", "healthy"];
const WARN = ["provisioning", "partially_failed", "draining", "degraded", "building", "deploying", "queued", "retrying", "pending", "warning", "over_limit", "past_due", "restoring", "uploading", "uploading_dump_optional", "estimating_size", "creating_target", "switching", "trialing"];
const BAD = ["offline", "disabled", "failed", "suspended", "deleted", "cancelled", "expired", "rolled_back", "limit_reached"];

export function statusClass(status: string): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  return OK.includes(s) ? "ok" : WARN.includes(s) ? "warn" : BAD.includes(s) ? "bad" : "muted";
}

export function Badge({ status }: { status: string }) {
  return <span className={`badge ${statusClass(status)}`}>{status}</span>;
}

type Tone = "violet" | "blue" | "green" | "amber" | "rose";

export function StatCard({
  icon, tone = "violet", label, value, unit, foot,
}: {
  icon: IconName; tone?: Tone; label: string; value: React.ReactNode; unit?: string; foot?: React.ReactNode;
}) {
  return (
    <div className="statcard">
      <div className="stat-top">
        <div className={`stat-icon ${tone}`}><Icon name={icon} size={18} /></div>
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-value">{value}{unit && <small>{unit}</small>}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

export function Panel({
  title, action, children, flush,
}: {
  title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; flush?: boolean;
}) {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{title}</span>
        {action}
      </div>
      <div className={`panel-body${flush ? " flush" : ""}`}>{children}</div>
    </div>
  );
}

export function Table({
  columns, rows, empty = "No records.",
}: {
  columns: string[]; rows: React.ReactNode[][]; empty?: string;
}) {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} className="small">{empty}</td></tr>
        ) : (
          rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)
        )}
      </tbody>
    </table>
  );
}

export function MetricRow({
  name, value, percent,
}: {
  name: string; value: string; percent: number;
}) {
  const p = Math.min(100, Math.max(0, percent));
  const tone = p >= 90 ? "bad" : p >= 75 ? "warn" : "";
  return (
    <div className="metric-row">
      <div className="metric-name">{name}</div>
      <div className="metric-val">{value} <span className="metric-pct">{p.toFixed(0)}%</span></div>
      <div className="progress"><span className={tone} style={{ width: `${p}%` }} /></div>
    </div>
  );
}

export function FeedItem({
  icon, tone = "violet", title, sub, time,
}: {
  icon: IconName; tone?: Tone; title: React.ReactNode; sub?: React.ReactNode; time?: string;
}) {
  return (
    <div className="feed-item">
      <div className={`feed-ico stat-icon ${tone}`}><Icon name={icon} size={15} /></div>
      <div className="feed-main">
        <div className="feed-title">{title}</div>
        {sub && <div className="feed-sub">{sub}</div>}
      </div>
      {time && <div className="feed-time">{time}</div>}
    </div>
  );
}

// Circular progress ring (e.g. "This Month vCPU").
export function Ring({ percent, size = 76 }: { percent: number; size?: number }) {
  const p = Math.min(100, Math.max(0, percent));
  const r = 32, c = 2 * Math.PI * r;
  const tone = p >= 90 ? "#dc2626" : p >= 75 ? "#d98e04" : "#6d5ef6";
  return (
    <svg width={size} height={size} viewBox="0 0 76 76">
      <circle cx="38" cy="38" r={r} fill="none" stroke="#eef0f3" strokeWidth="8" />
      <circle cx="38" cy="38" r={r} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 38 38)" />
      <text x="38" y="42" textAnchor="middle" fontSize="16" fontWeight="760" fill="#14161c">{p.toFixed(0)}%</text>
    </svg>
  );
}

export function bytes(n: bigint | number | null | undefined): string {
  if (n === null || n === undefined) return "∞";
  let v = Number(n);
  const u = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export function timeAgo(d: Date | string): string {
  const t = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(1, Math.floor((Date.now() - t.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
