import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { CMS_STATUSES, CMS_TYPES, cmsService, CmsValidationError } from "swyftstack-shared";
import { Badge, Breadcrumbs, Panel, timeAgo } from "@/components/ui";
import { CmsEditor } from "@/components/cms-editor";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function savePage(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = str(formData, "id");
  let contentJson: unknown = {};
  try {
    contentJson = JSON.parse(str(formData, "content_json") || "{}");
  } catch {
    contentJson = {};
  }
  try {
    await cmsService.update(
      id,
      {
        type: str(formData, "type"),
        status: str(formData, "status"),
        title: str(formData, "title"),
        slug: str(formData, "slug"),
        excerpt: str(formData, "excerpt") || null,
        contentJson,
        contentHtml: str(formData, "content_html") || null,
        seoTitle: str(formData, "seoTitle") || null,
        seoDescription: str(formData, "seoDescription") || null,
        ogImageUrl: str(formData, "ogImageUrl") || null,
        canonicalUrl: str(formData, "canonicalUrl") || null,
      },
      admin.id,
    );
  } catch (e) {
    if (e instanceof CmsValidationError) redirect(`/cms/${id}?error=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath(`/cms/${id}`);
  revalidatePath("/cms");
}

async function publishPage(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = str(formData, "id");
  await cmsService.publish(id, admin.id);
  revalidatePath(`/cms/${id}`);
}

async function unpublishPage(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = str(formData, "id");
  await cmsService.unpublish(id, admin.id);
  revalidatePath(`/cms/${id}`);
}

function previewHref(page: { type: string; slug: string }, token: string): string | null {
  if (page.type === "blog") return `/blog/${page.slug}?preview=${encodeURIComponent(token)}`;
  if (["announcement", "news", "changelog"].includes(page.type)) {
    return `/announcements/${page.slug}?preview=${encodeURIComponent(token)}`;
  }
  if (page.type === "comparison") return `/comparisons/${page.slug}?preview=${encodeURIComponent(token)}`;
  if (page.type === "landing_page") return `/`;
  if (page.type === "page") return `/${page.slug}`;
  return null;
}

export default async function CmsEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  await requireAdmin();
  const page = await cmsService.get(params.id);
  if (!page) notFound();
  const previewToken = cmsService.generatePreviewToken({ type: page.type, slug: page.slug });
  const preview = previewHref(page, previewToken);

  return (
    <>
      <Breadcrumbs items={[{ label: "CMS", href: "/cms" }, { label: page.title }]} />
      <div className="actionbar">
        <div>
          <h1 className="h1">{page.title}</h1>
          <p className="sub">
            <Badge status={page.status} /> · <span className="tag">{page.type}</span> · updated {timeAgo(page.updatedAt)}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {preview && (
            <a className="btn secondary" href={preview} target="_blank" rel="noreferrer">
              Preview
            </a>
          )}
          {page.status === "published" ? (
            <form action={unpublishPage}>
              <input type="hidden" name="id" value={page.id} />
              <button className="btn secondary">Unpublish</button>
            </form>
          ) : (
            <form action={publishPage}>
              <input type="hidden" name="id" value={page.id} />
              <button className="btn">Publish</button>
            </form>
          )}
        </div>
      </div>

      {searchParams.error && <div className="err" style={{ marginBottom: 14 }}>{searchParams.error}</div>}

      <Panel title="Edit" flush>
        <form action={savePage}>
          <input type="hidden" name="id" value={page.id} />
          <div className="form-grid">
            <div>
              <label>Title</label>
              <input name="title" required defaultValue={page.title} />
            </div>
            <div>
              <label>Slug</label>
              <input name="slug" defaultValue={page.slug} />
            </div>
            <div>
              <label>Type</label>
              <select name="type" defaultValue={page.type}>
                {(CMS_TYPES as readonly string[]).map((t) => (
                  <option key={t} value={t} disabled={t !== page.type}>{t}</option>
                ))}
              </select>
              <p className="small muted">Type cannot be changed after creation.</p>
            </div>
            <div>
              <label>Status</label>
              <select name="status" defaultValue={page.status}>
                {(CMS_STATUSES as readonly string[]).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>Excerpt</label>
              <textarea name="excerpt" defaultValue={page.excerpt ?? ""} rows={2} />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 18 }}>Content</div>
          <CmsEditor
            defaultJson={page.contentJson as unknown}
            defaultHtml={page.contentHtml ?? undefined}
            placeholder="Write the post body…"
          />

          <div className="section-title" style={{ marginTop: 18 }}>SEO</div>
          <div className="form-grid">
            <div>
              <label>SEO title</label>
              <input name="seoTitle" defaultValue={page.seoTitle ?? ""} />
            </div>
            <div>
              <label>OG image URL</label>
              <input name="ogImageUrl" defaultValue={page.ogImageUrl ?? ""} />
            </div>
            <div>
              <label>Canonical URL</label>
              <input name="canonicalUrl" defaultValue={page.canonicalUrl ?? ""} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label>SEO description</label>
              <textarea name="seoDescription" defaultValue={page.seoDescription ?? ""} rows={2} />
            </div>
          </div>

          <div className="row" style={{ marginTop: 18, gap: 8 }}>
            <button className="btn" type="submit">Save</button>
            <Link className="btn secondary" href="/cms">Cancel</Link>
          </div>
        </form>
      </Panel>
    </>
  );
}
