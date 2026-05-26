// Dynamic sitemap. Combines the curated list of static marketing routes with
// every *published* row in `cms_marketing_pages`. Drafts, archived, and
// authenticated routes are deliberately excluded - they must not be
// crawlable.
import type { MetadataRoute } from "next";
import { prisma } from "swyftstack-shared";
import { SITE_URL } from "@/components/marketing/jsonld";

// Static marketing routes. Order = priority hint (used as `priority` below).
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  // Top-level
  { path: "/",              priority: 1.0, changeFrequency: "weekly" },
  { path: "/platform",      priority: 0.9, changeFrequency: "weekly" },
  { path: "/postgres",      priority: 0.9, changeFrequency: "weekly" },
  { path: "/storage",       priority: 0.9, changeFrequency: "weekly" },
  { path: "/migrate",       priority: 0.85, changeFrequency: "monthly" },
  { path: "/pricing",       priority: 0.9, changeFrequency: "monthly" },
  { path: "/about",         priority: 0.7, changeFrequency: "yearly" },
  { path: "/security",      priority: 0.7, changeFrequency: "monthly" },
  { path: "/blog",          priority: 0.8, changeFrequency: "daily" },
  { path: "/announcements", priority: 0.8, changeFrequency: "daily" },

  // Alternative pages (high commercial-intent SEO)
  { path: "/supabase-alternative",         priority: 0.85, changeFrequency: "monthly" },
  { path: "/railway-alternative",          priority: 0.85, changeFrequency: "monthly" },
  { path: "/heroku-postgres-alternative",  priority: 0.85, changeFrequency: "monthly" },
  { path: "/render-alternative",           priority: 0.8,  changeFrequency: "monthly" },

  // Solution / integration pages
  { path: "/nextjs-database",  priority: 0.8, changeFrequency: "monthly" },
  { path: "/django-database",  priority: 0.75, changeFrequency: "monthly" },
  { path: "/laravel-database", priority: 0.75, changeFrequency: "monthly" },
  { path: "/nodejs-database",  priority: 0.75, changeFrequency: "monthly" },
  { path: "/backend-for-vibe-coded-apps", priority: 0.8, changeFrequency: "monthly" },

  // AI-tool specific pages
  { path: "/database-for-lovable",  priority: 0.75, changeFrequency: "monthly" },
  { path: "/database-for-bolt-new", priority: 0.75, changeFrequency: "monthly" },
  { path: "/database-for-cursor",   priority: 0.75, changeFrequency: "monthly" },
  { path: "/database-for-v0",       priority: 0.75, changeFrequency: "monthly" },

  // Migration source pages
  { path: "/migrate-from-supabase",    priority: 0.8, changeFrequency: "monthly" },
  { path: "/migrate-from-railway",     priority: 0.8, changeFrequency: "monthly" },
  { path: "/migrate-from-heroku",      priority: 0.8, changeFrequency: "monthly" },
  { path: "/migrate-from-planetscale", priority: 0.75, changeFrequency: "monthly" },

  // Legal pages (indexable; SEO crawlers expect to find them).
  { path: "/terms",           priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacy",         priority: 0.3, changeFrequency: "yearly" },
  { path: "/cookies",         priority: 0.3, changeFrequency: "yearly" },
  { path: "/refund",          priority: 0.3, changeFrequency: "yearly" },
  { path: "/acceptable-use",  priority: 0.3, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // CMS-backed content - only published rows. Wrapped in try/catch so a DB
  // outage doesn't take the sitemap down.
  let cms: MetadataRoute.Sitemap = [];
  try {
    const rows = await prisma.cmsMarketingPage.findMany({
      where: { status: "published", type: { in: ["blog", "announcement", "news", "changelog", "comparison"] } },
      select: { type: true, slug: true, updatedAt: true },
      take: 2000,
    });
    cms = rows.map((r) => {
      const base = r.type === "blog"
        ? `/blog/${r.slug}`
        : r.type === "comparison"
          ? `/comparisons/${r.slug}`
          : `/announcements/${r.slug}`;
      return {
        url: `${SITE_URL}${base}`,
        lastModified: r.updatedAt,
        changeFrequency: "weekly" as const,
        priority: r.type === "blog" ? 0.7 : 0.6,
      };
    });
  } catch {
    // DB unavailable - fall back to the static routes only. Better to ship
    // an incomplete sitemap than no sitemap at all.
  }

  return [...base, ...cms];
}
