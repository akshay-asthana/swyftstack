import Link from "next/link";
import { revalidatePath } from "next/cache";
import { formatPublicId, prisma, audit, uuidFromPublicId } from "swyftstack-shared";
import { Badge, Panel, StatCard, timeAgo } from "@/components/ui";
import { DataTable, RowMenu, type DTRow } from "@/components/client";
import { monthStart, vcpuHours } from "@/lib/stats";

export const dynamic = "force-dynamic";

async function setOrgStatus(formData: FormData, status: "active" | "suspended") {
  const id = uuidFromPublicId(String(formData.get("id")), "organization");
  await prisma.organization.update({ where: { id }, data: { status } });
  await audit({ actorType: "admin", action: `organization.${status}`, targetType: "organization", targetId: id });
  revalidatePath("/organizations");
}
async function suspendOrg(fd: FormData) { "use server"; await setOrgStatus(fd, "suspended"); }
async function unsuspendOrg(fd: FormData) { "use server"; await setOrgStatus(fd, "active"); }

async function grantAppDeployment(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return;
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      ownedOrganizations: { where: { status: { not: "deleted" } }, orderBy: { createdAt: "asc" }, take: 1 },
      orgMemberships: {
        where: { organization: { status: { not: "deleted" } } },
        include: { organization: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });
  const org = user?.ownedOrganizations[0] ?? user?.orgMemberships[0]?.organization;
  if (!org) return;
  await prisma.organization.update({
    where: { id: org.id },
    data: { enableAppDeployment: true },
  });
  await audit({
    actorType: "admin",
    action: "organization.app_deployment_enabled",
    targetType: "organization",
    targetId: org.id,
    metadata: { email },
  });
  revalidatePath("/organizations");
  revalidatePath(`/organizations/${formatPublicId("organization", org.id)}`);
}

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
    const publicOrgId = formatPublicId("organization", o.id);
    return {
      id: publicOrgId,
      href: `/organizations/${publicOrgId}`,
      values: {
        name: o.name,
        owner: o.owner?.email ?? "",
        plan: sub?.plan.name ?? "none",
        status: o.status,
        projects: o._count.projects,
        members: o._count.members,
        appDeployment: o.enableAppDeployment ? "enabled" : "disabled",
      },
      cells: [
        <Link key="n" href={`/organizations/${publicOrgId}`}><strong>{o.name}</strong></Link>,
        o.owner?.email ?? "—",
        sub?.plan.name ?? <span className="small">none</span>,
        <Badge key="s" status={o.status} />,
        o._count.projects,
        o._count.members,
        <Badge key="ad" status={o.enableAppDeployment ? "active" : "disabled"} />,
        `${vcpuHours(vcpuByOrg.get(o.id) ?? 0)} vCPU-hrs`,
        <span key="c" className="small">{timeAgo(o.createdAt)}</span>,
        <RowMenu key="m" label={o.name}>
          <Link href={`/organizations/${publicOrgId}`}>Open organization</Link>
          <Link href={`/organizations/${publicOrgId}#usage`}>View usage</Link>
          <div className="sep" />
          {o.status === "suspended" ? (
            <form action={unsuspendOrg}><input type="hidden" name="id" value={publicOrgId} /><button>Unsuspend</button></form>
          ) : (
            <form action={suspendOrg}><input type="hidden" name="id" value={publicOrgId} /><button className="danger">Suspend</button></form>
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

      <Panel title="Grant app deployment access">
        <form action={grantAppDeployment} className="row">
          <div style={{ minWidth: 280, flex: "1 1 280px" }}>
            <label style={{ marginTop: 0 }}>User email</label>
            <input name="email" type="email" placeholder="founder@example.com" required />
          </div>
          <button className="btn" type="submit" style={{ alignSelf: "end" }}>Enable deployment</button>
        </form>
        <p className="small" style={{ margin: "10px 0 0" }}>
          Enables console app deployment for the user&apos;s first owned organization, or first organization membership if they do not own one.
        </p>
      </Panel>

      <DataTable
        columns={[
          { key: "name", label: "Organization", sortable: true },
          { key: "owner", label: "Owner", sortable: true },
          { key: "plan", label: "Plan", sortable: true },
          { key: "status", label: "Status", sortable: true },
          { key: "projects", label: "Projects", sortable: true },
          { key: "members", label: "Members", sortable: true },
          { key: "appDeployment", label: "App deployment", sortable: true },
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
