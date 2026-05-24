import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma, verifyCmsPreviewToken } from "swyftstack-shared";
import { MarketingShell } from "@/components/marketing-shell";
import { renderCmsContent } from "@/components/cms-content";

export const dynamic = "force-dynamic";

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

export default async function BlogPost(
  { params, searchParams }: { params: { slug: string }; searchParams: { preview?: string } },
) {
  const post = await loadPost(params.slug, searchParams.preview);
  if (!post) notFound();
  const isDraft = post.status !== "published";
  return (
    <MarketingShell>
      <article className="mk-section">
        <div className="mk-container mk-prose">
          {isDraft && (
            <div className="note" style={{ marginBottom: 16 }}>
              Previewing a {post.status} post — not publicly visible.
            </div>
          )}
          <p className="small muted" style={{ margin: 0 }}>
            <Link href="/blog">Blog</Link>
            {post.publishedAt && <> · {new Date(post.publishedAt).toLocaleDateString()}</>}
          </p>
          <h1 style={{ fontSize: 36, marginTop: 12 }}>{post.title}</h1>
          {post.excerpt && <p className="mk-lead" style={{ textAlign: "left", marginLeft: 0 }}>{post.excerpt}</p>}
          {renderCmsContent(post)}
        </div>
      </article>
    </MarketingShell>
  );
}
