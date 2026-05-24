// CMS service. Tiny CRUD + slug/uniqueness helpers + preview token
// generator. Asset uploads do not live here — they go through the
// platform-bucket helper so admin code can reuse the existing
// `uploadStorageObject` pipeline.
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { audit } from "../audit.js";
import { env } from "../env.js";

export const CMS_TYPES = [
  "landing_page",
  "page",
  "blog",
  "testimonial",
  "comparison",
  "announcement",
  "news",
  "changelog",
  "docs",
  "faq",
] as const;
export type CmsType = (typeof CMS_TYPES)[number];

export const CMS_STATUSES = ["draft", "published", "archived"] as const;
export type CmsStatus = (typeof CMS_STATUSES)[number];

export function slugifyCms(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export class CmsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmsValidationError";
  }
}

export interface CmsInput {
  type: string;
  status?: string;
  title: string;
  slug?: string;
  excerpt?: string | null;
  contentJson?: unknown;
  contentHtml?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  authorId?: string | null;
  metadata?: Record<string, unknown>;
}

function validateInput(input: CmsInput) {
  if (!(CMS_TYPES as readonly string[]).includes(input.type)) {
    throw new CmsValidationError(`Unknown CMS type "${input.type}".`);
  }
  if (input.status && !(CMS_STATUSES as readonly string[]).includes(input.status)) {
    throw new CmsValidationError(`Unknown CMS status "${input.status}".`);
  }
  if (!input.title || input.title.length > 280) {
    throw new CmsValidationError("Title is required and must be ≤ 280 chars.");
  }
}

async function ensureUniqueSlug(type: string, slug: string, excludeId?: string): Promise<string> {
  const base = slugifyCms(slug) || "untitled";
  let candidate = base;
  let i = 2;
  while (true) {
    const collision = await prisma.cmsMarketingPage.findFirst({
      where: { type, slug: candidate, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
      select: { id: true },
    });
    if (!collision) return candidate;
    candidate = `${base}-${i++}`;
    if (i > 200) throw new CmsValidationError("Could not derive a unique slug.");
  }
}

export const cmsService = {
  async list(filter: { type?: string; status?: string } = {}) {
    return prisma.cmsMarketingPage.findMany({
      where: {
        ...(filter.type ? { type: filter.type } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 200,
    });
  },

  async listPublic(filter: { type: string; limit?: number }) {
    return prisma.cmsMarketingPage.findMany({
      where: { type: filter.type, status: "published" },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: filter.limit ?? 100,
    });
  },

  async get(id: string) {
    return prisma.cmsMarketingPage.findUnique({ where: { id } });
  },

  async findPublished(type: string, slug: string) {
    return prisma.cmsMarketingPage.findFirst({
      where: { type, slug, status: "published" },
    });
  },

  async create(input: CmsInput, actorUserId?: string) {
    validateInput(input);
    const slug = await ensureUniqueSlug(input.type, input.slug || input.title);
    const page = await prisma.cmsMarketingPage.create({
      data: {
        type: input.type,
        status: input.status ?? "draft",
        title: input.title,
        slug,
        excerpt: input.excerpt ?? null,
        contentJson: (input.contentJson ?? {}) as object,
        contentHtml: input.contentHtml ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        ogImageUrl: input.ogImageUrl ?? null,
        canonicalUrl: input.canonicalUrl ?? null,
        authorId: input.authorId ?? actorUserId ?? null,
        publishedAt: input.status === "published" ? new Date() : null,
        metadata: (input.metadata ?? {}) as object,
      },
    });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "cms.create",
      targetType: "cms_marketing_page",
      targetId: page.id,
      metadata: { type: page.type, slug: page.slug },
    });
    return page;
  },

  async update(id: string, input: Partial<CmsInput>, actorUserId?: string) {
    const existing = await prisma.cmsMarketingPage.findUniqueOrThrow({ where: { id } });
    if (input.type && input.type !== existing.type) {
      throw new CmsValidationError("Cannot change CMS type — create a new page instead.");
    }
    if (input.title !== undefined || input.slug !== undefined) {
      validateInput({ ...existing, ...input, title: input.title ?? existing.title } as CmsInput);
    }
    const nextSlug =
      input.slug && slugifyCms(input.slug) !== existing.slug
        ? await ensureUniqueSlug(existing.type, input.slug, id)
        : existing.slug;
    const nextStatus = input.status ?? existing.status;
    const page = await prisma.cmsMarketingPage.update({
      where: { id },
      data: {
        status: nextStatus,
        title: input.title ?? existing.title,
        slug: nextSlug,
        excerpt: input.excerpt === undefined ? existing.excerpt : input.excerpt,
        contentJson:
          input.contentJson === undefined
            ? (existing.contentJson as object)
            : ((input.contentJson ?? {}) as object),
        contentHtml: input.contentHtml === undefined ? existing.contentHtml : input.contentHtml,
        seoTitle: input.seoTitle === undefined ? existing.seoTitle : input.seoTitle,
        seoDescription: input.seoDescription === undefined ? existing.seoDescription : input.seoDescription,
        ogImageUrl: input.ogImageUrl === undefined ? existing.ogImageUrl : input.ogImageUrl,
        canonicalUrl: input.canonicalUrl === undefined ? existing.canonicalUrl : input.canonicalUrl,
        publishedAt:
          nextStatus === "published" && !existing.publishedAt
            ? new Date()
            : nextStatus !== "published"
              ? null
              : existing.publishedAt,
        metadata:
          input.metadata === undefined
            ? (existing.metadata as object)
            : ((input.metadata ?? {}) as object),
      },
    });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "cms.update",
      targetType: "cms_marketing_page",
      targetId: page.id,
      metadata: { status: page.status, slug: page.slug },
    });
    return page;
  },

  async publish(id: string, actorUserId?: string) {
    const page = await prisma.cmsMarketingPage.update({
      where: { id },
      data: { status: "published", publishedAt: new Date() },
    });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "cms.publish",
      targetType: "cms_marketing_page",
      targetId: id,
    });
    return page;
  },

  async unpublish(id: string, actorUserId?: string) {
    const page = await prisma.cmsMarketingPage.update({
      where: { id },
      data: { status: "draft" },
    });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "cms.unpublish",
      targetType: "cms_marketing_page",
      targetId: id,
    });
    return page;
  },

  async archive(id: string, actorUserId?: string) {
    const page = await prisma.cmsMarketingPage.update({
      where: { id },
      data: { status: "archived" },
    });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "cms.archive",
      targetType: "cms_marketing_page",
      targetId: id,
    });
    return page;
  },

  async delete(id: string, actorUserId?: string) {
    await prisma.cmsMarketingPage.delete({ where: { id } });
    await audit({
      actorType: "admin",
      actorUserId,
      action: "cms.delete",
      targetType: "cms_marketing_page",
      targetId: id,
    });
  },

  /** HMAC-signed preview token. Used by /blog/[slug]?preview=… to render
   *  drafts without exposing them publicly. Expires after 1 hour. */
  generatePreviewToken(target: { type: string; slug: string; ttlSeconds?: number }): string {
    const expires = Math.floor(Date.now() / 1000) + (target.ttlSeconds ?? 3600);
    const payload = `${target.type}:${target.slug}:${expires}`;
    const sig = crypto
      .createHmac("sha256", env.AUTH_SECRET)
      .update(payload)
      .digest("base64url");
    return `${expires}.${sig}`;
  },
};

export function verifyCmsPreviewToken(
  token: string,
  target: { type: string; slug: string },
): boolean {
  const [expiresRaw, sig] = token.split(".");
  if (!expiresRaw || !sig) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000)) return false;
  const payload = `${target.type}:${target.slug}:${expires}`;
  const expected = crypto
    .createHmac("sha256", env.AUTH_SECRET)
    .update(payload)
    .digest("base64url");
  if (expected.length !== sig.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}
