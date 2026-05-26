// /announcements - editorial index for product news and changelog. Fetches
// only `published` rows. Same shell/theme as blog so the brand stays
// consistent.
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing/shell";
import { ArticleCard } from "@/components/marketing/article-card";
import { SITE_URL } from "@/components/marketing/jsonld";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Announcements & changelog - Swyftstack",
  description: "Product announcements, weekly changelog, and what shipped this week at Swyftstack.",
  alternates: { canonical: `${SITE_URL}/announcements` },
  openGraph: {
    title: "Swyftstack - Announcements & changelog",
    description: "What we shipped this week, what's coming next, and the milestones along the way.",
    url: `${SITE_URL}/announcements`,
    type: "website",
  },
};

export default async function AnnouncementsIndex() {
  const posts = await prisma.cmsMarketingPage.findMany({
    where: { type: { in: ["announcement", "news", "changelog"] }, status: "published" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
  }).catch(() => []);

  return (
    <MarketingShell>
      <section className="m-article-hero-v2">
        <div className="m-container">
          <span className="m-article-tag">Product · Changelog</span>
          <h1 className="m-article-title-v2">Announcements & news</h1>
          <p className="m-article-excerpt">
            What we&rsquo;ve shipped, what we&rsquo;re building next, and the milestones along the way.
          </p>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          {posts.length === 0 ? (
            <div className="m-card" style={{ textAlign: "center", padding: 48 }}>
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>Nothing here yet</h3>
              <p className="m-feature-body" style={{ maxWidth: 480, margin: "0 auto" }}>
                The first announcements are coming soon. We&rsquo;ll post a note once V1 GA ships.
              </p>
            </div>
          ) : (
            <div className="m-article-list">
              {posts.map((p) => (
                <ArticleCard
                  key={p.id}
                  href={`/announcements/${p.slug}`}
                  title={p.title}
                  excerpt={p.excerpt}
                  date={p.publishedAt}
                  type={p.type}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
