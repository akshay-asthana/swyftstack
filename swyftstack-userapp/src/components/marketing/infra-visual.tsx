// InfrastructureVisual - a stylized "single control plane" overview showing
// a project bundling a database, bucket, backup, and live usage. Pure SVG
// + CSS so it ships zero JS and renders crisp on retina.

import { BackupIcon, BucketIcon, GaugeIcon, PostgresIcon } from "./icons";

export function InfrastructureVisual() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="m-infra">
        <Card
          dotColor="var(--m-ok)"
          label="Database"
          name="app_production"
          icon={<PostgresIcon size={18} />}
          meta={[<code key="v">PG 16.2</code>, "us-east", "0.42 GB"]}
          usage={42}
          spark={<Sparkline data={[3, 5, 4, 6, 8, 7, 9, 11, 10, 12]} />}
        />
        <Card
          dotColor="var(--m-ok)"
          label="Bucket"
          name="user-uploads"
          icon={<BucketIcon size={18} />}
          meta={[<code key="r">s3-api</code>, "public", "8.7 GB"]}
          usage={61}
          spark={<Sparkline data={[2, 3, 6, 8, 10, 12, 14, 12, 15, 18]} />}
        />
        <Card
          dotColor="var(--m-accent)"
          label="Backup"
          name="daily/2026-05-25"
          icon={<BackupIcon size={18} />}
          meta={[<code key="t">.dump</code>, "encrypted", "418 MB"]}
          usage={24}
          spark={<Sparkline data={[5, 6, 7, 6, 8, 7, 9, 8, 10, 9]} />}
        />
      </div>
      <div className="m-card" style={{ padding: 18 }}>
        <div className="m-row m-row-between" style={{ marginBottom: 10 }}>
          <div className="m-row" style={{ gap: 10 }}>
            <span className="m-feature-icon" style={{ width: 30, height: 30, marginBottom: 0 }}>
              <GaugeIcon size={16} />
            </span>
            <div>
              <div style={{ fontSize: 12, color: "var(--m-text-muted)", letterSpacing: ".1em", textTransform: "uppercase" }}>This billing period</div>
              <div style={{ fontWeight: 680, color: "var(--m-text-strong)" }}>Usage across your project</div>
            </div>
          </div>
          <div className="m-tag m-tag-ok">All under limit</div>
        </div>
        <UsageRow label="Database storage" value="0.42 / 10 GB" pct={4.2} />
        <UsageRow label="Object storage" value="8.7 / 100 GB" pct={8.7} />
        <UsageRow label="Egress" value="124 / 500 GB" pct={24.8} />
        <UsageRow label="Backup storage" value="18 / 100 GB" pct={18} />
      </div>
    </div>
  );
}

function Card({
  dotColor, label, name, icon, meta, usage, spark,
}: {
  dotColor: string;
  label: string;
  name: string;
  icon: React.ReactNode;
  meta: React.ReactNode[];
  usage: number;
  spark: React.ReactNode;
}) {
  return (
    <div className="m-infra-card">
      <div className="m-infra-label">
        <span className="dot" style={{ background: dotColor, color: dotColor }} />
        {label}
      </div>
      <div className="m-row" style={{ gap: 10 }}>
        <span className="m-feature-icon" style={{ width: 32, height: 32, marginBottom: 0 }}>{icon}</span>
        <div className="m-infra-name">{name}</div>
      </div>
      <div className="m-infra-meta">{meta.map((m, i) => <span key={i}>{m}</span>)}</div>
      <div className="m-infra-bar"><span style={{ width: `${usage}%` }} /></div>
      <div className="m-infra-spark">{spark}</div>
    </div>
  );
}

function UsageRow({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", padding: "10px 0", borderTop: "1px solid var(--m-border)" }}>
      <div style={{ fontWeight: 600, color: "var(--m-text)" }}>{label}</div>
      <div style={{ color: "var(--m-text-muted)", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>{value} <span style={{ marginLeft: 8 }}>{pct.toFixed(0)}%</span></div>
      <div className="m-infra-bar" style={{ gridColumn: "1 / -1" }}><span style={{ width: `${Math.min(100, pct)}%` }} /></div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 220, h = 36, max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const linePath = `M${pts.join(" L")}`;
  const areaPath = `M0,${h} L${pts.join(" L")} L${w},${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width="100%" height={h}>
      <defs>
        <linearGradient id="m-spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#m-spark-grad)" />
      <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
