import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma, audit } from "swyftstack-shared";
import { Badge, StatCard, timeAgo } from "@/components/ui";
import { DataTable, RowMenu, type DTRow } from "@/components/client";
import { monthStart, vcpuHours } from "@/lib/stats";

export const dynamic = "force-dynamic";

async function setOrgStatus(formData: FormData, status: "active" | "suspended") {
  const id = String(formData.get("id"));
  await prisma.organization.update({ where: { id }, data: { status } });
  await audit({ actorType: "admin", action: `organization.${status}`, targetType: "organization", targetId: id });
  revalidatePath("/organizations");
}
async function suspendOrg(fd: FormData) { "use server"; await setOrgStatus(fd, "suspended"); }
async function unsuspendOrg(fd: FormData) { "use server"; await setOrgStatus(fd, "active"); }

export default async function OrganizationsPage() {
  const [orgs, usageRows] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        owner: true,
        subscriptions: {
          where: { status: { in: ["active", "trialing", "past_due"] } },
          take: 1,
          orderBy: { createdAt: "desc" },
          include: { plan: true },
        },
        _count: { select: { projects: true, members: true } },
      },
    }),
    prisma.usageEvent.groupBy({
      by: ["organizationId"],
      where: { recordedAt: { gte: monthStart() }, usageType: "app_runtime_vcpu_seconds" },
      _sum: { quantity: true },
    }),
  ]);

  const vcpuByOrg = new Map(usageRows.map((r) => [r.organizationId, Number(r._sum.quantity ?? 0)]));
  const real = orgs.filter((o) => o.status !== "deleted");

  const rows: DTRow[] = real.map((o) => {
    const sub = o.subscriptions[0];
    return {
      id: o.id,
      href: `/organizations/${o.id}`,
      values: {
        name: o.name,
        owner: o.owner?.email ?? "",
        plan: sub?.plan.name ?? "none",
        status: o.status,
        projects: o._count.projects,
        members: o._count.members,
      },
      cells: [
        <Link key="n" href={`/organizations/${o.id}`}><strong>{o.name}</strong></Link>,
        o.owner?.email ?? "—",
        sub?.plan.name ?? <span className="small">none</span>,
        <Badge key="s" status={o.status} />,
        o._count.projects,
        o._count.members,
        `${vcpuHours(vcpuByOrg.get(o.id) ?? 0)} vCPU-hrs`,
        <span key="c" className="small">{timeAgo(o.createdAt)}</span>,
        <RowMenu key="m" label={o.name}>
          <Link href={`/organizations/${o.id}`}>Open organization</Link>
          <Link href={`/organizations/${o.id}#usage`}>View usage</Link>
          <div className="sep" />
          {o.status === "suspended" ? (
            <form action={unsuspendOrg}><input type="hidden" name="id" value={o.id} /><button>Unsuspend</button></form>
          ) : (
            <form action={suspendOrg}><input type="hidden" name="id" value={o.id} /><button className="danger">Suspend</button></form>
          )}
        </RowMenu>,
      ],
    };
  });

  return (
    <>
      <h1 className="h1">Organizations</h1>
      <p className="sub">Billing + ownership boundary. Plans and overrides apply at this scope.</p>

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="org" tone="violet" label="Organizations" value={real.length} />
        <StatCard icon="check" tone="green" label="Active" value={real.filter((o) => o.status === "active").length} />
        <StatCard icon="power" tone="rose" label="Suspended" value={real.filter((o) => o.status === "suspended").length} />
        <StatCard icon="projects" tone="blue" label="Total projects" value={real.reduce((s, o) => s + o._count.projects, 0)} />
      </div>

      <DataTable
        columns={[
          { key: "name", label: "Organization", sortable: true },
          { key: "owner", label: "Owner", sortable: true },
          { key: "plan", label: "Plan", sortable: true },
          { key: "status", label: "Status", sortable: true },
          { key: "projects", label: "Projects", sortable: true },
          { key: "members", label: "Members", sortable: true },
          { key: "usage", label: "Usage (mo)" },
          { key: "created", label: "Created" },
          { key: "actions", label: "" },
        ]}
        rows={rows}
        filters={[{ key: "status", label: "Status", options: ["active", "suspended"] }]}
        searchPlaceholder="Search organizations…"
        emptyText="No organizations yet."
      />
    </>
  );
}
