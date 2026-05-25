// /comparisons/[slug] — CMS-backed competitor comparison. Same shell as the
// rest of the marketing site so the look is consistent.
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma, verifyCmsPreviewToken } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing/shell";
import { renderCmsContent } from "@/components/cms-content";
import { SITE_URL } from "@/components/marketing/jsonld";
import { ArrowRightIcon } from "@/components/marketing/icons";

export const revalidate = 60;

async function loadPost(slug: string, previewToken: string | undefined) {
  const isPreview = previewToken ? verifyCmsPreviewToken(previewToken, { type: "comparison", slug }) : false;
  return prisma.cmsMarketingPage.findFirst({
    where: {
      type: "comparison",
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
  const title = post.seoTitle ?? `${post.title} — Swyftstack`;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  const url = post.canonicalUrl ?? `${SITE_URL}/comparisons/${post.slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, type: "article", url, images: post.ogImageUrl ? [post.ogImageUrl] : undefined },
    robots: post.status === "published" ? undefined : { index: false, follow: false },
  };
}

export default async function ComparisonPage(
  { params, searchParams }: { params: { slug: string }; searchParams: { preview?: string } },
) {
  const post = await loadPost(params.slug, searchParams.preview);
  if (!post) notFound();
  return (
    <MarketingShell>
      <section className="m-article-hero-v2">
        <div className="m-container" style={{ maxWidth: "var(--m-container-prose)" }}>
          <span className="m-article-tag">Comparison</span>
          <h1 className="m-article-title-v2">{post.title}</h1>
          {post.excerpt && <p className="m-article-excerpt">{post.excerpt}</p>}
          <div className="m-article-meta-v2">
            <Link href="/platform" style={{ color: "var(--m-text-brand)" }}>
              See platform overview <ArrowRightIcon size={12} />
            </Link>
          </div>
        </div>
      </section>
      <article className="m-article-body">
        <div className="m-container" style={{ maxWidth: "var(--m-container-prose)" }}>
          <div className="m-prose">{renderCmsContent(post)}</div>
        </div>
      </article>
    </MarketingShell>
  );
}
