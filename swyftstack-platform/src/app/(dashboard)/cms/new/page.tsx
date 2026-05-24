import { redirect } from "next/navigation";
import Link from "next/link";
import { CMS_TYPES, cmsService, CmsValidationError } from "swyftstack-shared";
import { Panel } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function createDraft(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const type = String(formData.get("type") ?? "blog");
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/cms/new?error=title");
  try {
    const page = await cmsService.create(
      {
        type,
        title,
        status: "draft",
        slug: String(formData.get("slug") ?? title),
      },
      admin.id,
    );
    redirect(`/cms/${page.id}`);
  } catch (e) {
    if (e instanceof CmsValidationError) {
      redirect(`/cms/new?error=${encodeURIComponent(e.message)}`);
    }
    throw e;
  }
}

export default async function CmsNewPage({ searchParams }: { searchParams: { error?: string } }) {
  await requireAdmin();
  return (
    <>
      <div className="actionbar">
        <div>
          <h1 className="h1">New content</h1>
          <p className="sub">
            Pick a type and title — Swyftstack creates a draft you can edit with TipTap.
            <Link href="/cms"> Back to all content</Link>
          </p>
        </div>
      </div>

      <Panel title="Content metadata">
        {searchParams.error && (
          <div className="err" style={{ marginBottom: 12 }}>
            {searchParams.error === "title" ? "Title is required." : searchParams.error}
          </div>
        )}
        <form action={createDraft}>
          <div className="form-grid">
            <div>
              <label>Type</label>
              <select name="type" defaultValue="blog">
                {(CMS_TYPES as readonly string[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Title</label>
              <input name="title" required placeholder="How we ship Swyftstack" />
            </div>
            <div>
              <label>Slug (optional)</label>
              <input name="slug" placeholder="how-we-ship" />
            </div>
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" type="submit">Create draft</button>
          </div>
        </form>
      </Panel>
    </>
  );
}
