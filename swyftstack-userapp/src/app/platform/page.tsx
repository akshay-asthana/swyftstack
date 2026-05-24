import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing-shell";
import { renderCmsContent } from "@/components/cms-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform — Swyftstack",
  description: "What Swyftstack provides: managed PostgreSQL, object storage, app hosting, backups, migrations, and usage controls.",
};

async function loadPlatformPage() {
  return prisma.cmsMarketingPage
    .findFirst({
      where: { type: "page", slug: "platform", status: "published" },
    })
    .catch(() => null);
}

export default async function PlatformPage() {
  const cms = await loadPlatformPage();
  return (
    <MarketingShell>
      <section className="mk-hero">
        <div className="mk-container">
          <h1 className="mk-h1">{cms?.title ?? "Everything in one control plane"}</h1>
          <p className="mk-lead">
            {cms?.excerpt ?? "Databases, object storage, app hosting, backups, and migrations — managed from one operational hub."}
          </p>
        </div>
      </section>
      {cms ? (
        <section className="mk-section">
          <div className="mk-container mk-prose">{renderCmsContent(cms)}</div>
        </section>
      ) : (
        <section className="mk-section">
          <div className="mk-container">
            <div className="mk-grid">
              <Block title="Database provisioning" body="One-click PostgreSQL. Auto-generated user, password, and connection URL. Optional import from any libpq source." />
              <Block title="Object storage" body="S3-compatible buckets per project. Public or signed-URL access. Storage and egress metered to your plan." />
              <Block title="App hosting" body="Deploy Next.js, Node, Python, or static. Auto-built and auto-served. Custom domains and SSL." />
              <Block title="Backups" body="Verified daily backups uploaded to your configured backup provider. Restore from any verified snapshot." />
              <Block title="Imports & migrations" body="Bring an existing database via libpq URL. Move workloads between nodes safely with verified migrations." />
              <Block title="Usage controls" body="Plans, limits, overrides. Real-time usage dashboards before billing surprises." />
            </div>
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <Link className="btn" href="/signup">Try Swyftstack</Link>
            </div>
          </div>
        </section>
      )}
    </MarketingShell>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="mk-feature">
      <div className="mk-feature-title">{title}</div>
      <p className="mk-feature-body">{body}</p>
    </div>
  );
}
