// CMS list — every marketing page across types. Filterable by type/status.
import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CMS_TYPES, CMS_STATUSES, cmsService, prisma } from "swyftstack-shared";
import { Badge, Panel, timeAgo } from "@/components/ui";
import { DataTable, RowMenu, type DTRow } from "@/components/client";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function publishAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await cmsService.publish(id, admin.id);
  revalidatePath("/cms");
}
async function unpublishAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await cmsService.unpublish(id, admin.id);
  revalidatePath("/cms");
}
async function archiveAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await cmsService.archive(id, admin.id);
  revalidatePath("/cms");
}
async function deleteAction(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await cmsService.delete(id, admin.id);
  redirect("/cms");
}

export default async function CmsListPage({
  searchParams,
}: {
  searchParams: { type?: string; status?: string };
}) {
  await requireAdmin();
  const pages = await cmsService.list({
    type: searchParams.type && (CMS_TYPES as readonly string[]).includes(searchParams.type)
      ? searchParams.type : undefined,
    status: searchParams.status && (CMS_STATUSES as readonly string[]).includes(searchParams.status)
      ? searchParams.status : undefined,
  });

  const authors = await prisma.user.findMany({
    where: { id: { in: pages.map((p) => p.authorId).filter(Boolean) as string[] } },
    select: { id: true, email: true, name: true },
  });
  const authorMap = new Map(authors.map((a) => [a.id, a.name ?? a.email]));

  const rows: DTRow[] = pages.map((p) => ({
    id: p.id,
    href: `/cms/${p.id}`,
    values: {
      type: p.type,
      status: p.status,
      title: p.title,
      published: p.publishedAt ? p.publishedAt.toISOString() : "",
      updated: p.updatedAt.toISOString(),
    },
    cells: [
      <div key="t">
        <Link href={`/cms/${p.id}`}><strong>{p.title}</strong></Link>
        <div className="small muted">/{p.slug}</div>
      </div>,
      <span key="ty" className="tag">{p.type}</span>,
      <Badge key="s" status={p.status} />,
      <span key="a" className="small">{p.authorId ? authorMap.get(p.authorId) ?? "—" : "—"}</span>,
      <span key="pa" className="small">{p.publishedAt ? timeAgo(p.publishedAt) : "—"}</span>,
      <span key="u" className="small">{timeAgo(p.updatedAt)}</span>,
      <RowMenu key="m">
        <Link href={`/cms/${p.id}`}>Edit</Link>
        {p.type === "blog" && p.status === "published" && (
          <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer">Open public</a>
        )}
        <div className="sep" />
        {p.status !== "published" && (
          <form action={publishAction}><input type="hidden" name="id" value={p.id} /><button>Publish</button></form>
        )}
        {p.status === "published" && (
          <form action={unpublishAction}><input type="hidden" name="id" value={p.id} /><button>Unpublish</button></form>
        )}
        {p.status !== "archived" && (
          <form action={archiveAction}><input type="hidden" name="id" value={p.id} /><button>Archive</button></form>
        )}
        <form action={deleteAction}><input type="hidden" name="id" value={p.id} /><button className="danger">Delete</button></form>
      </RowMenu>,
    ],
  }));

  return (
    <>
      <div className="actionbar">
        <div>
          <h1 className="h1">Content (CMS)</h1>
          <p className="sub">
            Marketing pages, blog posts, comparisons, announcements. Edited in TipTap; assets
            stored in the platform bucket.
          </p>
        </div>
        <Link className="btn" href="/cms/new">+ New content</Link>
      </div>

      <Panel title={`All content (${pages.length})`} flush>
        <DataTable
          columns={[
            { key: "title", label: "Title", sortable: true },
            { key: "type", label: "Type", sortable: true },
            { key: "status", label: "Status", sortable: true },
            { key: "author", label: "Author" },
            { key: "published", label: "Published", sortable: true },
            { key: "updated", label: "Updated", sortable: true },
            { key: "actions", label: "" },
          ]}
          rows={rows}
          filters={[
            { key: "type", label: "Type", options: CMS_TYPES as unknown as string[] },
            { key: "status", label: "Status", options: CMS_STATUSES as unknown as string[] },
          ]}
          searchPlaceholder="Search by title or slug…"
          emptyText="No content yet — click + New content to create your first page."
        />
      </Panel>
    </>
  );
}
