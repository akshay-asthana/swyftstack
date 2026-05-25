// /blog — editorial blog index. Fetches only `published` rows from
// `cms_marketing_pages` so drafts/archived posts are never crawlable.
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing/shell";
import { ArticleCard } from "@/components/marketing/article-card";
import { SITE_URL } from "@/components/marketing/jsonld";

// ISR — re-fetch CMS rows at most every 60 seconds. Keeps SEO snappy
// without hammering the DB on every visit.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Blog — Swyftstack",
  description: "Engineering posts and product updates from the Swyftstack team. Deep-dives on managed PostgreSQL, object storage, migrations, and reliability.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    title: "Swyftstack Blog",
    description: "Engineering deep-dives and product updates from Swyftstack.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
};

export default async function BlogIndex() {
  const posts = await prisma.cmsMarketingPage.findMany({
    where: { type: "blog", status: "published" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
  }).catch(() => []);

  return (
    <MarketingShell>
      <section className="m-article-hero-v2">
        <div className="m-container">
          <span className="m-article-tag">Engineering · Product</span>
          <h1 className="m-article-title-v2">The Swyftstack blog</h1>
          <p className="m-article-excerpt">
            Engineering deep-dives, product notes, and what we&rsquo;re learning while
            running managed PostgreSQL, S3-compatible storage, and migrations
            at scale.
          </p>
        </div>
      </section>

      <section className="m-section">
        <div className="m-container">
          {posts.length === 0 ? (
            <div className="m-card" style={{ textAlign: "center", padding: 48 }}>
              <h3 style={{ fontSize: 20, marginBottom: 8 }}>No posts yet — but they&rsquo;re coming.</h3>
              <p className="m-feature-body" style={{ maxWidth: 480, margin: "0 auto" }}>
                Subscribe to our changelog at <a href="/announcements" style={{ color: "var(--m-text-brand)" }}>/announcements</a> in
                the meantime.
              </p>
            </div>
          ) : (
            <div className="m-article-list">
              {posts.map((p) => (
                <ArticleCard
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  title={p.title}
                  excerpt={p.excerpt}
                  date={p.publishedAt}
                  type="blog"
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </MarketingShell>
  );
}
