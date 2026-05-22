import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma, enqueueJob, audit, BANDWIDTH_IN_TYPES, BANDWIDTH_OUT_TYPES } from "quickdock-shared";
import { Badge, bytes, StatCard, timeAgo } from "@/components/ui";
import { DataTable, RowMenu, type DTRow } from "@/components/client";
import { monthStart, vcpuHours } from "@/lib/stats";

export const dynamic = "force-dynamic";

async function suspend(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await enqueueJob("suspend_project", { projectId: id });
  await audit({ actorType: "admin", action: "project.suspend_requested", targetType: "project", targetId: id });
  revalidatePath("/projects");
}
async function unsuspend(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.project.update({ where: { id }, data: { status: "active" } });
  await audit({ actorType: "admin", action: "project.unsuspended", targetType: "project", targetId: id });
  revalidatePath("/projects");
}

export default async function ProjectsPage() {
  const [projects, usageRows, dbRows] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        organization: { include: { owner: true } },
        _count: { select: { apps: true, databases: true, buckets: true, members: true } },
      },
    }),
    prisma.usageEvent.groupBy({
      by: ["projectId", "usageType"],
      where: { recordedAt: { gte: monthStart() }, projectId: { not: null } },
      _sum: { quantity: true },
    }),
    prisma.database.groupBy({
      by: ["projectId"],
      where: { status: { not: "deleted" } },
      _sum: { currentSizeBytes: true },
    }),
  ]);

  const usageByProject = new Map<string, { vcpu: number; bwIn: number; bwOut: number }>();
  for (const r of usageRows) {
    if (!r.projectId) continue;
    const u = usageByProject.get(r.projectId) ?? { vcpu: 0, bwIn: 0, bwOut: 0 };
    const q = Number(r._sum.quantity ?? 0);
    if (r.usageType === "app_runtime_vcpu_seconds") u.vcpu += q;
    if ((BANDWIDTH_IN_TYPES as readonly string[]).includes(r.usageType)) u.bwIn += q;
    if ((BANDWIDTH_OUT_TYPES as readonly string[]).includes(r.usageType)) u.bwOut += q;
    usageByProject.set(r.projectId, u);
  }
  const dbSizeByProject = new Map(dbRows.map((r) => [r.projectId, Number(r._sum.currentSizeBytes ?? 0)]));
  const real = projects.filter((p) => p.status !== "deleted");

  const rows: DTRow[] = real.map((p) => {
    const u = usageByProject.get(p.id) ?? { vcpu: 0, bwIn: 0, bwOut: 0 };
    return {
      id: p.id,
      href: `/projects/${p.id}`,
      values: {
        name: p.name,
        org: p.organization.name,
        owner: p.organization.owner?.email ?? "",
        status: p.status,
        apps: p._count.apps,
        databases: p._count.databases,
        vcpu: u.vcpu,
      },
      cells: [
        <div key="n">
          <Link href={`/projects/${p.id}`}><strong>{p.name}</strong></Link>
          <div className="small">{p.organization.name}</div>
        </div>,
        p.organization.owner?.email ?? "—",
        <Badge key="s" status={p.status} />,
        p._count.apps,
        p._count.databases,
        bytes(dbSizeByProject.get(p.id) ?? 0),
        vcpuHours(u.vcpu),
        <span key="bw" className="small">↓{bytes(u.bwIn)} ↑{bytes(u.bwOut)}</span>,
        <span key="c" className="small">{timeAgo(p.createdAt)}</span>,
        <RowMenu key="m" label={p.name}>
          <Link href={`/projects/${p.id}`}>Open project</Link>
          <Link href={`/projects/${p.id}#usage`}>View usage</Link>
          <Link href={`/organizations/${p.organizationId}`}>Open organization</Link>
          <div className="sep" />
          {p.status === "active" ? (
            <form action={suspend}><input type="hidden" name="id" value={p.id} /><button className="danger">Suspend project</button></form>
          ) : (
            <form action={unsuspend}><input type="hidden" name="id" value={p.id} /><button>Unsuspend project</button></form>
          )}
        </RowMenu>,
      ],
    };
  });

  return (
    <>
      <h1 className="h1">Projects</h1>
      <p className="sub">Workload boundary: apps, databases, buckets, members, usage.</p>

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="projects" tone="violet" label="Projects" value={real.length} />
        <StatCard icon="check" tone="green" label="Active" value={real.filter((p) => p.status === "active").length} />
        <StatCard icon="alert" tone="amber" label="Over limit" value={real.filter((p) => p.status === "over_limit").length} />
        <StatCard icon="power" tone="rose" label="Suspended" value={real.filter((p) => p.status === "suspended").length} />
      </div>

      <DataTable
        columns={[
          { key: "name", label: "Project", sortable: true },
          { key: "owner", label: "Owner", sortable: true },
          { key: "status", label: "Status", sortable: true },
          { key: "apps", label: "Apps", sortable: true },
          { key: "databases", label: "DBs", sortable: true },
          { key: "storage", label: "DB storage" },
          { key: "vcpu", label: "vCPU-hrs", sortable: true },
          { key: "bandwidth", label: "Bandwidth" },
          { key: "created", label: "Created" },
          { key: "actions", label: "" },
        ]}
        rows={rows}
        filters={[{ key: "status", label: "Status", options: ["active", "suspended", "over_limit"] }]}
        searchPlaceholder="Search projects…"
        emptyText="No projects yet."
      />
    </>
  );
}
