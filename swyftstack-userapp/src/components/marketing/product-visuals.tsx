// Product-page visual components: storage bucket, database table, backup
// timeline, signed-URL/connection-string cards, and usage graph. All server
// components — pure HTML + SVG, zero JS.
//
// Each visual is intentionally stylised: it should *evoke* the real
// dashboard without being a screenshot. That keeps the marketing site
// fast (no images) and lets the styling change cleanly when the real
// dashboard changes.

import {
  BackupIcon, BucketIcon, CheckIcon, GlobeIcon, LockIcon, PostgresIcon,
} from "./icons";

/* ──────────────────────── Storage bucket visual ──────────────────────── */

const SAMPLE_FILES = [
  { name: "avatars/u-9a2f.png",         size: "284 KB", badge: "public",  icon: "img" as const },
  { name: "exports/orders-2026-q1.csv", size: "8.4 MB", badge: "private", icon: "csv" as const },
  { name: "uploads/onboarding.mp4",     size: "62 MB",  badge: "signed",  icon: "mp4" as const },
  { name: "receipts/INV-04812.pdf",     size: "412 KB", badge: "private", icon: "pdf" as const },
  { name: "thumbs/event-cover.webp",    size: "138 KB", badge: "public",  icon: "img" as const },
];

export function StorageBucketVisual() {
  return (
    <div className="m-bucket">
      <div className="m-bucket-head">
        <span className="m-feature-icon" style={{ width: 36, height: 36, marginBottom: 0 }}>
          <BucketIcon size={18} />
        </span>
        <div>
          <div style={{ fontSize: 12, color: "var(--m-text-muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Bucket</div>
          <div style={{ fontWeight: 700, color: "var(--m-text-strong)", fontSize: 15 }}>user-uploads</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <span className="m-tag m-tag-ok">CDN on</span>
          <span className="m-tag">8.7 GB</span>
        </div>
      </div>
      {SAMPLE_FILES.map((f) => (
        <div key={f.name} className="m-bucket-row">
          <FileGlyph kind={f.icon} />
          <span className="name">{f.name}</span>
          <span className={`badge ${badgeClass(f.badge)}`}>{f.badge}</span>
          <span className="size">{f.size}</span>
        </div>
      ))}
    </div>
  );
}

function badgeClass(b: string) {
  if (b === "public") return "m-tag m-tag-ok";
  if (b === "signed") return "m-tag";
  return "m-tag";
}

function FileGlyph({ kind }: { kind: "img" | "csv" | "mp4" | "pdf" }) {
  const color =
    kind === "img" ? "#a78bfa" :
    kind === "csv" ? "#34d399" :
    kind === "mp4" ? "#fbbf24" :
                     "#22d3ee";
  return (
    <span
      aria-hidden
      style={{
        width: 22, height: 22, borderRadius: 5,
        background: "rgba(255,255,255,.04)",
        border: "1px solid var(--m-border)",
        display: "grid", placeItems: "center",
        fontSize: 9, fontWeight: 700, color,
        fontFamily: "var(--m-font-mono)",
        textTransform: "uppercase",
      }}
    >
      {kind === "mp4" ? "▶" : kind}
    </span>
  );
}

/* ──────────────────────── Signed URL / endpoint card ──────────────────────── */

export function SignedUrlCard() {
  return (
    <div className="m-card" style={{ padding: 22 }}>
      <div className="m-row m-row-tight m-mb-3">
        <span className="m-feature-icon" style={{ width: 32, height: 32, marginBottom: 0 }}>
          <LockIcon size={16} />
        </span>
        <span style={{ fontSize: 12, color: "var(--m-text-muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>
          Signed URL · 15 min expiry
        </span>
      </div>
      <code style={{
        display: "block",
        fontFamily: "var(--m-font-mono)",
        fontSize: 12,
        padding: "12px 14px",
        borderRadius: "var(--m-r-sm)",
        background: "var(--m-bg-2)",
        border: "1px solid var(--m-border-strong)",
        color: "var(--m-text-strong)",
        lineHeight: 1.5,
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}>
        https://storage.swyftstack.com/exports/orders-2026-q1.csv?<span style={{ color: "var(--m-accent-2)" }}>X-Amz-Signature</span>=•••&<span style={{ color: "var(--m-accent-2)" }}>X-Amz-Expires</span>=900
      </code>
      <div className="m-mt-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Bullet icon={<GlobeIcon size={14} />} text="CDN-fronted public reads" />
        <Bullet icon={<LockIcon size={14} />} text="Per-bucket access keys" />
        <Bullet icon={<CheckIcon size={14} />} text="AWS SDK v2 / v3 compatible" />
        <Bullet icon={<CheckIcon size={14} />} text="Webhook events on upload" />
      </div>
    </div>
  );
}

function Bullet({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--m-text-2)", fontSize: 13 }}>
      <span style={{ color: "var(--m-ok)" }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

/* ──────────────────────── Connection string card ──────────────────────── */

export function ConnectionStringCard() {
  return (
    <div className="m-card" style={{ padding: 22 }}>
      <div className="m-row m-row-tight m-mb-3">
        <span className="m-feature-icon" style={{ width: 32, height: 32, marginBottom: 0 }}>
          <PostgresIcon size={16} />
        </span>
        <span style={{ fontSize: 12, color: "var(--m-text-muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>
          DATABASE_URL · SSL required
        </span>
      </div>
      <code style={{
        display: "block",
        fontFamily: "var(--m-font-mono)",
        fontSize: 12.5,
        padding: "12px 14px",
        borderRadius: "var(--m-r-sm)",
        background: "var(--m-bg-2)",
        border: "1px solid var(--m-border-strong)",
        color: "var(--m-text-strong)",
        lineHeight: 1.5,
        overflowX: "auto",
        whiteSpace: "nowrap",
      }}>
        postgresql://app:<span style={{ color: "var(--m-text-faint)" }}>••••••</span>@db.swyftstack.com:5432/app_production?sslmode=require
      </code>
      <div className="m-mt-4" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Bullet icon={<CheckIcon size={14} />} text="PostgreSQL 16" />
        <Bullet icon={<CheckIcon size={14} />} text="PgBouncer pooled" />
        <Bullet icon={<CheckIcon size={14} />} text="Daily encrypted backups" />
        <Bullet icon={<CheckIcon size={14} />} text="Restorable in one click" />
      </div>
    </div>
  );
}

/* ──────────────────────── Database table visual ──────────────────────── */

const TABLE_ROWS = [
  { id: "01H8…7Q", email: "ada@lovelace.org",  plan: "pro",      created: "2026-04-12" },
  { id: "01H8…2A", email: "leo@hippocampus.io", plan: "starter", created: "2026-04-12" },
  { id: "01H8…9F", email: "noor@bytes.dev",    plan: "pro",      created: "2026-04-13" },
  { id: "01H8…3K", email: "kai@studio.so",     plan: "starter", created: "2026-04-13" },
  { id: "01H8…D2", email: "ren@signalfox.app", plan: "enterprise", created: "2026-04-14" },
];

export function DatabaseTableVisual() {
  return (
    <div className="m-table-vis">
      <div style={{
        padding: "12px 16px",
        background: "var(--m-bg-1)",
        borderBottom: "1px solid var(--m-border)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ color: "var(--m-accent-2)" }}><PostgresIcon size={16} /></span>
        <span style={{ fontWeight: 700, color: "var(--m-text-strong)", fontSize: 13.5 }}>app_production.users</span>
        <span className="m-tag" style={{ marginLeft: "auto" }}>1,284 rows</span>
      </div>
      <div className="m-table-vis-head">
        <span>#</span><span>id</span><span>email</span><span>plan</span><span>created_at</span>
      </div>
      {TABLE_ROWS.map((r, i) => (
        <div key={r.id} className="m-table-vis-row">
          <span className="id">{i + 1}</span>
          <span className="id">{r.id}</span>
          <span style={{ color: "var(--m-text)" }}>{r.email}</span>
          <span style={{ color: r.plan === "pro" ? "var(--m-text-brand)" : r.plan === "enterprise" ? "var(--m-accent-warm)" : "var(--m-text-muted)" }}>{r.plan}</span>
          <span style={{ color: "var(--m-text-muted)" }}>{r.created}</span>
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Backup timeline ──────────────────────── */

const BACKUPS = [
  { when: "Today · 03:00",     label: "daily/2026-05-25",  size: "418 MB", verified: true,  cur: true },
  { when: "Yesterday · 03:00", label: "daily/2026-05-24",  size: "412 MB", verified: true },
  { when: "Sat · 03:00",       label: "daily/2026-05-23",  size: "409 MB", verified: true },
  { when: "Fri · 03:00",       label: "daily/2026-05-22",  size: "405 MB", verified: true },
  { when: "Thu · 03:00",       label: "daily/2026-05-21",  size: "401 MB", verified: true },
  { when: "Wed · 03:00",       label: "daily/2026-05-20",  size: "398 MB", verified: true },
];

export function BackupTimeline() {
  return (
    <div className="m-timeline">
      <div className="m-row" style={{ marginBottom: 14 }}>
        <span className="m-feature-icon" style={{ width: 32, height: 32, marginBottom: 0 }}>
          <BackupIcon size={16} />
        </span>
        <div>
          <div style={{ fontWeight: 680, color: "var(--m-text-strong)", fontSize: 15 }}>Encrypted daily backups</div>
          <div style={{ fontSize: 12.5, color: "var(--m-text-muted)" }}>Retained 7 days on Starter, 30 days on Pro</div>
        </div>
        <span className="m-tag m-tag-ok" style={{ marginLeft: "auto" }}>All verified</span>
      </div>
      {BACKUPS.map((b) => (
        <div key={b.label} className="m-timeline-row">
          <span className="when">{b.when}</span>
          <span className="what">
            {b.label}
            <small>{b.size} · checksum verified</small>
          </span>
          {b.cur ? (
            <span className="m-tag m-tag-ok"><CheckIcon size={12} /> latest</span>
          ) : b.verified ? (
            <span style={{ color: "var(--m-ok)", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600 }}>
              <CheckIcon size={12} /> verified
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────── Usage graph ──────────────────────── */

export function UsageGraphVisual() {
  // Pretend daily egress over 14 days, peaking at the 11th day.
  const data = [120, 140, 138, 162, 158, 175, 184, 196, 210, 232, 248, 224, 218, 226];
  return (
    <div className="m-card" style={{ padding: 22 }}>
      <div className="m-row" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: "var(--m-text-muted)", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 700 }}>Egress · last 14 days</div>
          <div style={{ fontWeight: 720, color: "var(--m-text-strong)", fontSize: 26, marginTop: 4, letterSpacing: "-0.02em" }}>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>2.93 TB</span>
            <span style={{ fontSize: 13, color: "var(--m-text-muted)", marginLeft: 8, fontWeight: 500 }}>of 5 TB</span>
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--m-ok)", fontWeight: 600 }}>+12.4%</div>
          <div style={{ fontSize: 11, color: "var(--m-text-muted)" }}>vs last period</div>
        </div>
      </div>
      <UsageBars data={data} />
    </div>
  );
}

function UsageBars({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${data.length}, 1fr)`, gap: 4, alignItems: "end", height: 80 }}>
      {data.map((v, i) => {
        const h = Math.max(8, (v / max) * 100);
        const recent = i >= data.length - 3;
        return (
          <div
            key={i}
            style={{
              height: `${h}%`,
              borderRadius: 4,
              background: recent
                ? "linear-gradient(180deg, #a78bfa, #6d5ef6)"
                : "linear-gradient(180deg, rgba(34,211,238,.55), rgba(34,211,238,.18))",
              border: "1px solid",
              borderColor: recent ? "rgba(167,139,250,.5)" : "rgba(34,211,238,.25)",
            }}
            aria-hidden
          />
        );
      })}
    </div>
  );
}
