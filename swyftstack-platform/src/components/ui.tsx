import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "./icons";

const OK = ["active", "running", "live", "verified", "succeeded", "completed", "accepted", "ok", "online", "healthy"];
const WARN = ["provisioning", "partially_failed", "draining", "degraded", "building", "deploying", "queued", "retrying", "pending", "warning", "over_limit", "past_due", "restoring", "uploading", "uploading_dump_optional", "estimating_size", "creating_target", "switching", "trialing", "untested"];
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

// ---------- Skeletons ----------
export function SkeletonBlock({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <span className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

export function StatCardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid compact skeleton-grid">
      {Array.from({ length: count }, (_, i) => (
        <div className="statcard skeleton-card" key={i}>
          <div className="stat-top">
            <SkeletonBlock className="sk-icon" />
            <SkeletonBlock style={{ width: 96, height: 12 }} />
          </div>
          <SkeletonBlock style={{ width: "62%", height: 30 }} />
          <SkeletonBlock style={{ width: "44%", height: 11 }} />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ title = true }: { title?: boolean }) {
  return (
    <div className="panel skeleton-panel">
      {title && (
        <div className="panel-head">
          <SkeletonBlock style={{ width: 150, height: 15 }} />
          <SkeletonBlock style={{ width: 76, height: 12 }} />
        </div>
      )}
      <div className="panel-body">
        <SkeletonBlock className="sk-chart" />
      </div>
    </div>
  );
}

export function TableSkeleton({
  columns = 5,
  rows = 8,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="panel skeleton-panel">
      <div className="panel-head">
        <SkeletonBlock style={{ width: 140, height: 15 }} />
        <SkeletonBlock style={{ width: 92, height: 30 }} />
      </div>
      <div className="panel-body flush">
        <table className="skeleton-table" aria-hidden="true">
          <thead>
            <tr>
              {Array.from({ length: columns }, (_, i) => (
                <th key={i}><SkeletonBlock style={{ width: i === 0 ? 120 : 72, height: 10 }} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, r) => (
              <tr key={r}>
                {Array.from({ length: columns }, (_, c) => (
                  <td key={c}>
                    <SkeletonBlock style={{ width: c === 0 ? "72%" : "54%", height: 12 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PageSkeleton({
  title = true,
  cards = 6,
  charts = 2,
  tables = 1,
}: {
  title?: boolean;
  cards?: number;
  charts?: number;
  tables?: number;
}) {
  return (
    <div className="page-skeleton" aria-busy="true" aria-label="Loading">
      {title && (
        <div className="page-head">
          <div>
            <SkeletonBlock style={{ width: 190, height: 24, marginBottom: 8 }} />
            <SkeletonBlock style={{ width: 360, maxWidth: "70vw", height: 13 }} />
          </div>
          <SkeletonBlock style={{ width: 118, height: 36 }} />
        </div>
      )}
      {cards > 0 && <StatCardSkeleton count={cards} />}
      {charts > 0 && (
        <div className="split-even skeleton-split">
          {Array.from({ length: charts }, (_, i) => <ChartSkeleton key={i} />)}
        </div>
      )}
      {Array.from({ length: tables }, (_, i) => <TableSkeleton key={i} columns={i === 0 ? 6 : 5} rows={i === 0 ? 8 : 5} />)}
    </div>
  );
}

// ---------- Area chart (pure SVG, deterministic) ----------
export function AreaChart({
  points, labels, height = 200, color = "#6d5ef6", maxXTicks = 8,
}: {
  points: number[]; labels?: string[]; height?: number; color?: string; maxXTicks?: number;
}) {
  const W = 760, H = height, padL = 36, padR = 12, padT = 14, padB = 26;
  const max = Math.max(1, ...points);
  const n = points.length;
  const gradientId = `area-${color.replace(/[^a-zA-Z0-9]/g, "")}-${height}`;
  const labelIndexes = tickIndexes(n, maxXTicks);
  const xAt = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const yAt = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const area = `${line} L${xAt(n - 1).toFixed(1)},${H - padB} L${xAt(0).toFixed(1)},${H - padB} Z`;
  const gridY = [0, 0.5, 1].map((f) => padT + (H - padT - padB) * f);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
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
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((v, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(v)} r="2.6" fill="#fff" stroke={color} strokeWidth="2" />
        ))}
        {labels?.map((l, i) => labelIndexes.has(i) && (
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

export function timeAgo(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const t = typeof d === "string" ? new Date(d) : d;
  const s = Math.max(1, Math.floor((Date.now() - t.getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ---------- Breadcrumbs ----------
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          {it.href ? (
            <Link href={it.href}>{it.label}</Link>
          ) : (
            <span className="cur">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// ---------- Modal (CSS :target — server-component friendly) ----------
export function Modal({
  id, title, children, wide,
}: {
  id: string; title: React.ReactNode; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div id={id} className="modal-backdrop">
      <div className="modal-card" style={wide ? { width: "min(960px, 100%)" } : undefined}>
        <div className="modal-head">
          <strong>{title}</strong>
          <a href="#" className="modal-close" aria-label="Close">×</a>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- Drawer (CSS :target side panel) ----------
export function Drawer({
  id, title, children,
}: {
  id: string; title: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div id={id} className="drawer-backdrop">
      <div className="drawer-card">
        <div className="drawer-head">
          <strong>{title}</strong>
          <a href="#" className="modal-close" aria-label="Close">×</a>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- EmptyState ----------
export function EmptyState({
  icon = "overview", title, hint, action,
}: {
  icon?: IconName; title: string; hint?: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="stat-icon violet" style={{ margin: "0 auto 10px" }}>
        <Icon name={icon} size={18} />
      </div>
      <div style={{ fontWeight: 650, color: "var(--text)" }}>{title}</div>
      {hint && <div className="small" style={{ marginTop: 4 }}>{hint}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

// ---------- KeyValue ----------
export function KeyValue({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="kv">
      {rows.map(([k, v], i) => (
        <React.Fragment key={i}>
          <dt>{k}</dt>
          <dd>{v ?? "—"}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

// ---------- Tag ----------
export function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return <span className={`tag${accent ? " accent" : ""}`}>{children}</span>;
}

// ---------- ProgressBar ----------
export function ProgressBar({
  used, limit, label, format = (n) => String(Math.round(n)),
}: {
  used: number; limit: number | null; label?: string; format?: (n: number) => string;
}) {
  const pct = limit && limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const tone = pct >= 100 ? "bad" : pct >= 80 ? "warn" : "ok";
  return (
    <div style={{ marginBottom: 4 }}>
      {label && (
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
          <span className="small">{label}</span>
          <span className="small">
            {format(used)} {limit ? `/ ${format(limit)}` : "/ ∞"}
          </span>
        </div>
      )}
      <div className="progress">
        <span className={tone} style={{ width: `${limit ? pct : 0}%` }} />
      </div>
    </div>
  );
}

// ---------- MiniStat ----------
export function MiniStat({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="mini-stat">
      <span className="ms-k">{k}</span>
      <span className="ms-v">{v}</span>
    </div>
  );
}

// ---------- BarChart (horizontal) ----------
export function BarChart({
  items, color = "#6d5ef6", format = (n) => String(n),
}: {
  items: { name: string; value: number }[];
  color?: string;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <div className="small">No data.</div>;
  return (
    <div className="barchart">
      {items.map((it, i) => (
        <div className="bc-row" key={i}>
          <span className="bc-name" title={it.name}>{it.name}</span>
          <span className="bc-track">
            <span className="bc-fill" style={{ width: `${(it.value / max) * 100}%`, background: color }} />
          </span>
          <span className="bc-val">{format(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- LineChart (multi-series, pure SVG) ----------
export function LineChart({
  series, labels, height = 200, maxXTicks = 8,
}: {
  series: { name: string; points: number[]; color: string }[];
  labels?: string[];
  height?: number;
  maxXTicks?: number;
}) {
  const W = 760, H = height, padL = 44, padR = 12, padT = 14, padB = 26;
  const all = series.flatMap((s) => s.points);
  const max = Math.max(1, ...all);
  const n = Math.max(...series.map((s) => s.points.length), 1);
  const labelIndexes = tickIndexes(n, maxXTicks);
  const xAt = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const yAt = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => padT + (H - padT - padB) * f);
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" preserveAspectRatio="none" style={{ display: "block" }}>
        {gridY.map((y, i) => (
          <line key={i} x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e9eaef" strokeWidth="1" />
        ))}
        {[0, 0.5, 1].map((f, i) => (
          <text key={i} x={padL - 8} y={padT + (H - padT - padB) * (1 - f) + 4}
            fontSize="10" fill="#9aa0ad" textAnchor="end">{Math.round(max * f)}</text>
        ))}
        {series.map((s, si) => {
          const line = s.points
            .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
            .join(" ");
          return (
            <path key={si} d={line} fill="none" stroke={s.color} strokeWidth="2.4"
              strokeLinejoin="round" strokeLinecap="round" />
          );
        })}
        {labels?.map((l, i) => labelIndexes.has(i) && (
          <text key={i} x={xAt(i)} y={H - 8} fontSize="10" fill="#9aa0ad" textAnchor="middle">{l}</text>
        ))}
      </svg>
      <div className="chart-legend">
        {series.map((s) => (
          <span key={s.name}><span className="dot" style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
    </div>
  );
}

function tickIndexes(count: number, maxTicks: number): Set<number> {
  if (count <= 0) return new Set();
  const limit = Math.max(2, maxTicks);
  if (count <= limit) return new Set(Array.from({ length: count }, (_, i) => i));
  const step = Math.ceil((count - 1) / (limit - 1));
  const indexes = new Set<number>();
  for (let i = 0; i < count; i += step) indexes.add(i);
  indexes.add(count - 1);
  return indexes;
}
