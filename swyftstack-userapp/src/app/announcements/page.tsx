import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "News — Swyftstack",
  description: "Announcements, changelog, and product news from Swyftstack.",
};

export default async function AnnouncementsIndex() {
  const posts = await prisma.cmsMarketingPage.findMany({
    where: { type: { in: ["announcement", "news", "changelog"] }, status: "published" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
  }).catch(() => []);

  return (
    <MarketingShell>
      <section className="mk-section">
        <div className="mk-container">
          <h1 className="mk-h1" style={{ fontSize: 36, marginBottom: 8 }}>News</h1>
          <p className="mk-lead" style={{ maxWidth: 720, margin: 0 }}>
            Announcements, changelog, and what we shipped this week.
          </p>
          <div className="mk-blog-list" style={{ marginTop: 32 }}>
            {posts.map((p) => (
              <Link key={p.id} href={`/announcements/${p.slug}`} className="mk-blog-card">
                <div className="small muted">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "Draft"} · {p.type}
                </div>
                <strong style={{ display: "block", marginTop: 4, fontSize: 16 }}>{p.title}</strong>
                {p.excerpt && <p className="small" style={{ marginTop: 8 }}>{p.excerpt}</p>}
              </Link>
            ))}
            {posts.length === 0 && <p className="small muted">No announcements yet.</p>}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
