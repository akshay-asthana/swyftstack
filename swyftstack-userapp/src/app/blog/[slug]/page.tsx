// /blog/[slug] - single CMS-backed blog post. Renders TipTap JSON via our
// own walker (no admin editor bundled). Adds BlogPosting structured data
// and unique metadata derived from the row.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma, verifyCmsPreviewToken } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing/shell";
import { renderCmsContent } from "@/components/cms-content";
import { ArticleCard } from "@/components/marketing/article-card";
import { SITE_URL } from "@/components/marketing/jsonld";
import { ArrowRightIcon, BoltIcon } from "@/components/marketing/icons";

export const revalidate = 60;

async function loadPost(slug: string, previewToken: string | undefined) {
  const isPreview = previewToken ? verifyCmsPreviewToken(previewToken, { type: "blog", slug }) : false;
  return prisma.cmsMarketingPage.findFirst({
    where: {
      type: "blog",
      slug,
      ...(isPreview ? {} : { status: "published" }),
    },
  });
}

export async function generateMetadata(
  { params, searchParams }: { params: { slug: string }; searchParams: { preview?: string } },
): Promise<Metadata> {
  const post = await loadPost(params.slug, searchParams.preview);
  if (!post) return { title: "Not found" };
  const title = post.seoTitle ?? `${post.title} - Swyftstack`;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  const url = post.canonicalUrl ?? `${SITE_URL}/blog/${post.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "article",
      url,
      images: post.ogImageUrl ? [post.ogImageUrl] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: {
      card: post.ogImageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: post.ogImageUrl ? [post.ogImageUrl] : undefined,
    },
    // Drafts must not be indexed even if someone shares a preview link.
    robots: post.status === "published" ? undefined : { index: false, follow: false },
  };
}

export default async function BlogPost(
  { params, searchParams }: { params: { slug: string }; searchParams: { preview?: string } },
) {
  const post = await loadPost(params.slug, searchParams.preview);
  if (!post) notFound();
  const isDraft = post.status !== "published";

  // Pull a few related published posts (same type, excluding this one).
  const related = await prisma.cmsMarketingPage.findMany({
    where: { type: "blog", status: "published", slug: { not: post.slug } },
    orderBy: [{ publishedAt: "desc" }],
    take: 3,
  }).catch(() => []);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    image: post.ogImageUrl ?? undefined,
    mainEntityOfPage: post.canonicalUrl ?? `${SITE_URL}/blog/${post.slug}`,
    publisher: {
      "@type": "Organization",
      name: "Swyftstack",
      url: SITE_URL,
    },
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="m-article-hero-v2">
        <div className="m-container" style={{ maxWidth: "var(--m-container-prose)" }}>
          {isDraft && (
            <div className="m-draft">
              <BoltIcon size={14} /> Previewing a {post.status} post - not publicly visible.
            </div>
          )}
          <span className="m-article-tag">Engineering</span>
          <h1 className="m-article-title-v2">{post.title}</h1>
          {post.excerpt && <p className="m-article-excerpt">{post.excerpt}</p>}
          <div className="m-article-meta-v2">
            {post.publishedAt && (
              <span>
                {post.publishedAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
            <span className="sep">·</span>
            <Link href="/blog" style={{ color: "var(--m-text-brand)" }}>
              All posts <ArrowRightIcon size={12} />
            </Link>
          </div>
        </div>
      </section>

      <article className="m-article-body">
        <div className="m-container" style={{ maxWidth: "var(--m-container-prose)" }}>
          <div className="m-prose">{renderCmsContent(post)}</div>
        </div>
      </article>

      {related.length > 0 && (
        <section className="m-article-related">
          <div className="m-container">
            <h2 style={{ fontSize: 22, marginBottom: 18 }}>More from the blog</h2>
            <div className="m-article-list">
              {related.map((r) => (
                <ArticleCard
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  title={r.title}
                  excerpt={r.excerpt}
                  date={r.publishedAt}
                  type="blog"
                />
              ))}
            </div>
          </div>
        </section>
      )}
    </MarketingShell>
  );
}
