import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing-shell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — Swyftstack",
  description: "Engineering posts and product updates from the Swyftstack team.",
};

export default async function BlogIndex() {
  const posts = await prisma.cmsMarketingPage.findMany({
    where: { type: "blog", status: "published" },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 100,
  }).catch(() => []);

  return (
    <MarketingShell>
      <section className="mk-section">
        <div className="mk-container">
          <h1 className="mk-h1" style={{ fontSize: 36, marginBottom: 8 }}>Blog</h1>
          <p className="mk-lead" style={{ maxWidth: 720, margin: 0 }}>
            Engineering posts, product updates, and notes from running Swyftstack.
          </p>
          <div className="mk-blog-list" style={{ marginTop: 32 }}>
            {posts.map((p) => (
              <Link key={p.id} href={`/blog/${p.slug}`} className="mk-blog-card">
                <div className="small muted">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "Draft"}
                </div>
                <strong style={{ display: "block", marginTop: 4, fontSize: 16 }}>{p.title}</strong>
                {p.excerpt && <p className="small" style={{ marginTop: 8 }}>{p.excerpt}</p>}
              </Link>
            ))}
            {posts.length === 0 && <p className="small muted">No posts yet.</p>}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
