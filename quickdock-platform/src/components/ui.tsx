import React from "react";
import { Icon, type IconName } from "./icons";

const OK = ["active", "running", "live", "verified", "succeeded", "completed", "accepted", "ok", "online", "healthy"];
const WARN = ["provisioning", "draining", "degraded", "building", "deploying", "queued", "retrying", "pending", "warning", "over_limit", "past_due", "restoring", "uploading", "trialing", "untested"];
const BAD = ["offline", "disabled", "failed", "suspended", "deleted", "cancelled", "expired", "rolled_back", "limit_reached"];

export function statusClass(status: string): "ok" | "warn" | "bad" | "muted" {
  const s = (status || "").toLowerCase();
  return OK.includes(s) ? "ok" : WARN.includes(s) ? "warn" : BAD.includes(s) ? "bad" : "muted";
}

export function Badge({ status }: { status: string }) {
  return <span className={`badge ${statusClass(status)}`}>{status}</span>;
}

export function Stat({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="card">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

type Tone = "violet" | "blue" | "green" | "amber" | "rose";

export function StatCard({
  icon, tone = "violet", label, value, unit, delta, deltaUp, deltaNote,
}: {
  icon: IconName; tone?: Tone; label: string; value: React.ReactNode; unit?: string;
  delta?: string; deltaUp?: boolean; deltaNote?: string;
}) {
  return (
    <div className="statcard">
      <div className="stat-top">
        <div className={`stat-icon ${tone}`}><Icon name={icon} size={18} /></div>
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-value">{value}{unit && <small>{unit}</small>}</div>
      {delta !== undefined && (
        <div className={`stat-delta ${deltaUp ? "up" : "down"}`}>
          <Icon name={deltaUp ? "arrowUp" : "arrowDown"} size={12} />
          {delta}{deltaNote && <span className="muted">{deltaNote}</span>}
        </div>
      )}
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
  columns, rows,
}: {
  columns: string[]; rows: React.ReactNode[][];
}) {
  return (
    <table>
      <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} className="small">No records.</td></tr>
        ) : (
          rows.map((r, i) => <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>)
        )}
      </tbody>
    </table>
  );
}

// ---------- Area chart (pure SVG, deterministic) ----------
export function AreaChart({
  points, labels, height = 200, color = "#6d5ef6",
}: {
  points: number[]; labels?: string[]; height?: number; color?: string;
}) {
  const W = 760, H = height, padL = 36, padR = 12, padT = 14, padB = 26;
  const max = Math.max(1, ...points);
  const n = points.length;
  const xAt = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const yAt = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const area = `${line} L${xAt(n - 1).toFixed(1)},${H - padB} L${xAt(0).toFixed(1)},${H - padB} Z`;
  const gridY = [0, 0.5, 1].map((f) => padT + (H - padT - padB) * f);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id="qd-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {gridY.map((y, i) => (
          <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e9eaef" strokeWidth="1" />
        ))}
        {[0, 0.5, 1].map((f, i) => (
          <text key={i} x={padL - 8} y={padT + (H - padT - padB) * (1 - f) + 4}
            fontSize="10" fill="#9aa0ad" textAnchor="end">{Math.round(max * f)}</text>
        ))}
        <path d={area} fill="url(#qd-area)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((v, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(v)} r="2.6" fill="#fff" stroke={color} strokeWidth="2" />
        ))}
        {labels?.map((l, i) => (
          <text key={i} x={xAt(i)} y={H - 8} fontSize="10" fill="#9aa0ad" textAnchor="middle">{l}</text>
        ))}
      </svg>
    </div>
  );
}

// ---------- Donut ----------
export function Donut({
  segments, total, caption, size = 132,
}: {
  segments: { value: number; color: string; label: string }[];
  total?: number; caption?: string; size?: number;
}) {
  const sum = segments.reduce((s, x) => s + x.value, 0);
  const shown = total ?? sum;
  const r = 54, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="#eef0f3" strokeWidth="16" />
        {sum > 0 && segments.map((s, i) => {
          const len = (s.value / sum) * c;
          const el = (
            <circle key={i} cx="66" cy="66" r={r} fill="none" stroke={s.color} strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform="rotate(-90 66 66)" strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
        <text x="66" y="62" textAnchor="middle" fontSize="26" fontWeight="760" fill="#14161c">{shown}</text>
        <text x="66" y="80" textAnchor="middle" fontSize="10.5" fill="#79808f">{caption ?? "Total"}</text>
      </svg>
      <div className="donut-legend">
        {segments.map((s) => (
          <div className="row-line" key={s.label}>
            <span><span className="dot" style={{ background: s.color }} />{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Metric row (top resource usage) ----------
export function MetricRow({
  icon, name, value, percent,
}: {
  icon: IconName; name: string; value: string; percent: number;
}) {
  const p = Math.min(100, Math.max(0, percent));
  const tone = p >= 90 ? "bad" : p >= 75 ? "warn" : "";
  return (
    <div className="metric-row">
      <div className="metric-ico"><Icon name={icon} size={15} /></div>
      <div className="metric-main">
        <div className="metric-name">{name}</div>
        <div className="progress"><span className={tone} style={{ width: `${p}%` }} /></div>
      </div>
      <div className="metric-val"><b>{value}</b><div className="metric-pct">{p.toFixed(0)}%</div></div>
    </div>
  );
}

// ---------- Activity feed ----------
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

export function HealthRow({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" | "bad" }) {
  return (
    <div className="health-row">
      <span className="health-label">
        <span style={{ color: `var(--${tone})`, display: "grid", placeItems: "center" }}><Icon name="check" size={14} /></span>
        {label}
      </span>
      <strong>{value}</strong>
    </div>
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
