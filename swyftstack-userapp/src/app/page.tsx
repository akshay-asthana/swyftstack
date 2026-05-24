// Public marketing landing page. If a logged-in user lands here, they still
// see marketing — the console is at /console. We use CMS content when a
// `landing_page` row is published, otherwise fall back to static copy.
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing-shell";
import { renderCmsContent } from "@/components/cms-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Swyftstack — Databases, storage and apps on one platform",
  description:
    "Provision PostgreSQL databases, object storage, and host apps from a single control plane. Built for small teams.",
};

async function loadLandingContent() {
  return prisma.cmsMarketingPage
    .findFirst({
      where: { type: "landing_page", status: "published" },
      orderBy: { publishedAt: "desc" },
    })
    .catch(() => null);
}

export default async function Landing() {
  const cms = await loadLandingContent();
  return (
    <MarketingShell>
      <section className="mk-hero">
        <div className="mk-container">
          <h1 className="mk-h1">{cms?.title ?? "One control plane for databases, storage, and apps."}</h1>
          <p className="mk-lead">
            {cms?.excerpt ??
              "Spin up managed PostgreSQL, object storage, and app hosting in minutes. Migrate workloads between nodes without downtime. Built for small teams who want infrastructure that just works."}
          </p>
          <div className="row" style={{ gap: 10, justifyContent: "center", marginTop: 18 }}>
            <Link className="btn" href="/signup">Start free</Link>
            <Link className="btn secondary" href="/platform">See the platform</Link>
          </div>
        </div>
      </section>

      {cms && (
        <section className="mk-section">
          <div className="mk-container mk-prose">{renderCmsContent(cms)}</div>
        </section>
      )}

      <section className="mk-section">
        <div className="mk-container">
          <h2 className="mk-h2">Everything you need to ship</h2>
          <div className="mk-grid">
            <Feature title="Managed PostgreSQL" body="Create databases with one click. Import from any URL. Daily backups, password rotation, and instant snapshots." />
            <Feature title="Object storage" body="S3-compatible buckets per project. Storage capacity and egress metered against your plan." />
            <Feature title="App hosting" body="Deploy Next.js, Node, Python, and static sites. Automatic builds, custom domains, and rollback." />
            <Feature title="Backups & restores" body="Verified daily backups go to your configured storage provider. Restore safely from the dashboard." />
            <Feature title="Imports & migrations" body="Bring an existing database over via libpq URL. Move workloads between nodes without losing data." />
            <Feature title="Usage controls" body="Plans, limits, overrides. See per-project and per-app usage in real time before bills surprise you." />
          </div>
        </div>
      </section>

      <section className="mk-section mk-section-alt">
        <div className="mk-container">
          <h2 className="mk-h2">Built for small teams</h2>
          <p className="mk-lead" style={{ maxWidth: 720 }}>
            Self-hosted on your VPS fleet. Add a node, Swyftstack auto-detects hardware,
            you confirm, and it joins the pool. No agents to babysit, no cloud lock-in,
            and one operational view across nodes, databases, storage, and apps.
          </p>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container row between" style={{ flexWrap: "wrap", gap: 16 }}>
          <div>
            <h2 className="mk-h2" style={{ marginBottom: 6 }}>Ready to ship?</h2>
            <p className="small muted" style={{ margin: 0 }}>Start free. Upgrade when you outgrow it.</p>
          </div>
          <div className="row" style={{ gap: 10 }}>
            <Link className="btn" href="/signup">Create account</Link>
            <Link className="btn secondary" href="/pricing">See pricing</Link>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-container">
          <h2 className="mk-h2">FAQ</h2>
          <Faq q="Can I bring an existing database?" a="Yes. Use the database import flow — paste a libpq URL and Swyftstack dumps, uploads, and restores into your project." />
          <Faq q="Where does my data live?" a="On the nodes you connect. Swyftstack is the control plane; storage and DBs run on your VPS fleet." />
          <Faq q="Do you charge for egress?" a="Egress is metered per plan. The usage page shows the live counter and your remaining budget." />
        </div>
      </section>
    </MarketingShell>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="mk-feature">
      <div className="mk-feature-title">{title}</div>
      <p className="mk-feature-body">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="mk-faq">
      <summary>{q}</summary>
      <p>{a}</p>
    </details>
  );
}
