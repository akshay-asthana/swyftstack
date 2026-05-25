// HeroOrchestratorVisual — premium "live production stack" preview for
// the homepage hero. Static SVG/HTML so it costs essentially zero per
// frame. The previous version animated SVG packets along paths with
// drop-shadow filters and was the main page-hang culprit; this version
// has exactly ONE animated element (the small "Live" pulse dot) and
// nothing else moves.
//
// The widget is composed to look like a real product screenshot:
//   • macOS-style window chrome with traffic lights and a path bar
//   • Left column: the connection string moment (the iconic dev moment),
//     plus the storage bucket file list and the backup timeline
//   • Right column: live-feeling metric tiles for storage, egress, backups
//     and a small request-rate chart
// All of it is reusable static visuals (StorageBucketVisual,
// BackupTimeline, etc.) wrapped in a glass terminal frame.
//
// Server component. Zero JS. Renders inside a Suspense-free path.

import { BackupIcon, BoltIcon, BucketIcon, CheckIcon, GaugeIcon, GlobeIcon, LockIcon, PostgresIcon } from "./icons";

export function HeroOrchestratorVisual() {
  return (
    <div className="m-stack">
      {/* macOS-style window chrome */}
      <div className="m-stack-chrome">
        <span className="m-stack-dot red" />
        <span className="m-stack-dot yellow" />
        <span className="m-stack-dot green" />
        <span className="m-stack-path">
          <span className="m-stack-path-org">swyftstack</span>
          <span className="m-stack-path-sep">/</span>
          <span className="m-stack-path-proj">app-production</span>
        </span>
        <span className="m-stack-live">
          <span className="m-stack-live-dot" /> Live
        </span>
      </div>

      <div className="m-stack-body">
        {/* Left column */}
        <div className="m-stack-col">
          {/* Connection string card */}
          <div className="m-stack-card">
            <div className="m-stack-card-head">
              <span className="m-stack-card-icon"><PostgresIcon size={14} /></span>
              <span className="m-stack-card-title">DATABASE_URL</span>
              <span className="m-stack-card-tag ok">SSL · pooled</span>
            </div>
            <div className="m-stack-conn">
              <span className="dim">postgresql://</span>
              <span className="strong">app</span>
              <span className="dim">:</span>
              <span className="mask">••••••</span>
              <span className="dim">@</span>
              <span className="strong">db.swyftstack.com</span>
              <span className="dim">:5432/</span>
              <span className="strong">app_production</span>
            </div>
            <div className="m-stack-pills">
              <span className="m-stack-pill ok"><CheckIcon size={10} /> PG 16</span>
              <span className="m-stack-pill"><BoltIcon size={10} /> 47s deploy</span>
              <span className="m-stack-pill"><LockIcon size={10} /> SSL required</span>
            </div>
          </div>

          {/* Bucket card */}
          <div className="m-stack-card">
            <div className="m-stack-card-head">
              <span className="m-stack-card-icon"><BucketIcon size={14} /></span>
              <span className="m-stack-card-title">user-uploads</span>
              <span className="m-stack-card-tag">8.7 GB</span>
            </div>
            <div className="m-stack-files">
              <Row glyph="img" name="avatars/u-9a2f.png"           size="284 KB" tag="public"  />
              <Row glyph="csv" name="exports/orders-2026-q1.csv"   size="8.4 MB" tag="private" />
              <Row glyph="mp4" name="uploads/onboarding.mp4"       size="62 MB"  tag="signed"  />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="m-stack-col">
          {/* Metric tiles */}
          <div className="m-stack-metrics">
            <Metric icon={<PostgresIcon size={12} />} label="Databases"  value="3"     sub="0.42 / 10 GB"  />
            <Metric icon={<BucketIcon size={12} />}   label="Buckets"    value="2"     sub="8.7 / 100 GB"  />
            <Metric icon={<GlobeIcon size={12} />}    label="Egress"     value="124 GB" sub="of 500 GB"     />
            <Metric icon={<GaugeIcon size={12} />}    label="Healthy"    value="100%"  sub="last 30 days"   tone="ok" />
          </div>

          {/* Request-rate sparkline */}
          <div className="m-stack-card">
            <div className="m-stack-card-head">
              <span className="m-stack-card-icon"><BoltIcon size={14} /></span>
              <span className="m-stack-card-title">Request rate</span>
              <span className="m-stack-card-tag ok">+12.4%</span>
            </div>
            <Sparkbars data={[12, 14, 13, 17, 16, 19, 21, 23, 26, 24, 27, 31, 29, 33]} />
          </div>

          {/* Backups card */}
          <div className="m-stack-card">
            <div className="m-stack-card-head">
              <span className="m-stack-card-icon"><BackupIcon size={14} /></span>
              <span className="m-stack-card-title">Backups</span>
              <span className="m-stack-card-tag ok">verified</span>
            </div>
            <div className="m-stack-bkp">
              <BkpRow when="today · 03:00"  size="418 MB" />
              <BkpRow when="yesterday"      size="412 MB" />
              <BkpRow when="2 days ago"     size="409 MB" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ glyph, name, size, tag }: { glyph: "img" | "csv" | "mp4"; name: string; size: string; tag: string }) {
  const color = glyph === "img" ? "#a78bfa" : glyph === "csv" ? "#34d399" : "#fbbf24";
  return (
    <div className="m-stack-file">
      <span className="glyph" style={{ color }}>{glyph === "mp4" ? "▶" : glyph}</span>
      <span className="name">{name}</span>
      <span className={`tag ${tag === "public" ? "ok" : ""}`}>{tag}</span>
      <span className="size">{size}</span>
    </div>
  );
}

function Metric({
  icon, label, value, sub, tone,
}: { icon: React.ReactNode; label: string; value: string; sub: string; tone?: "ok" }) {
  return (
    <div className={`m-stack-metric ${tone === "ok" ? "ok" : ""}`}>
      <div className="m-stack-metric-head">{icon} {label}</div>
      <div className="m-stack-metric-val">{value}</div>
      <div className="m-stack-metric-sub">{sub}</div>
    </div>
  );
}

function BkpRow({ when, size }: { when: string; size: string }) {
  return (
    <div className="m-stack-bkp-row">
      <span className="dot" />
      <span className="when">{when}</span>
      <span className="size">{size}</span>
      <CheckIcon size={11} />
    </div>
  );
}

function Sparkbars({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div className="m-stack-spark">
      {data.map((v, i) => {
        const recent = i >= data.length - 3;
        return (
          <span
            key={i}
            className={`bar ${recent ? "hot" : ""}`}
            style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
