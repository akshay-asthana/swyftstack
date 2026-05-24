import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma, verifyCmsPreviewToken } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing-shell";
import { renderCmsContent } from "@/components/cms-content";

export const dynamic = "force-dynamic";

const ANNOUNCEMENT_TYPES = ["announcement", "news", "changelog"];

async function loadPost(slug: string, previewToken: string | undefined) {
  const isPreview = previewToken
    ? ANNOUNCEMENT_TYPES.some((t) => verifyCmsPreviewToken(previewToken, { type: t, slug }))
    : false;
  return prisma.cmsMarketingPage.findFirst({
    where: {
      type: { in: ANNOUNCEMENT_TYPES },
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
  return {
    title: post.seoTitle ?? `${post.title} — Swyftstack`,
    description: post.seoDescription ?? post.excerpt ?? undefined,
    openGraph: {
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt ?? undefined,
      images: post.ogImageUrl ? [post.ogImageUrl] : undefined,
    },
    alternates: post.canonicalUrl ? { canonical: post.canonicalUrl } : undefined,
  };
}

export default async function AnnouncementPage(
  { params, searchParams }: { params: { slug: string }; searchParams: { preview?: string } },
) {
  const post = await loadPost(params.slug, searchParams.preview);
  if (!post) notFound();
  return (
    <MarketingShell>
      <article className="mk-section">
        <div className="mk-container mk-prose">
          <p className="small muted" style={{ margin: 0 }}>
            <Link href="/announcements">News</Link> · {post.type}
            {post.publishedAt && <> · {new Date(post.publishedAt).toLocaleDateString()}</>}
          </p>
          <h1 style={{ fontSize: 32, marginTop: 12 }}>{post.title}</h1>
          {post.excerpt && <p className="mk-lead" style={{ textAlign: "left", marginLeft: 0 }}>{post.excerpt}</p>}
          {renderCmsContent(post)}
        </div>
      </article>
    </MarketingShell>
  );
}
