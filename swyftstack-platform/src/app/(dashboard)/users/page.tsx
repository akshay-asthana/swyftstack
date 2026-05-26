import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  audit,
  createPasswordCustomerAccount,
  formatPublicId,
  prisma,
  SignupEmailExistsError,
  BANDWIDTH_IN_TYPES,
  BANDWIDTH_OUT_TYPES,
  uuidFromPublicId,
} from "swyftstack-shared";
import { Badge, bytes, StatCard, Modal, AreaChart, BarChart, Panel, timeAgo } from "@/components/ui";
import { DataTable, RowMenu, type DTRow } from "@/components/client";
import { assignPlanToUser } from "@/lib/user-admin";
import { monthStart, vcpuHours } from "@/lib/stats";

export const dynamic = "force-dynamic";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

async function createUser(formData: FormData) {
  "use server";
  try {
    const account = await createPasswordCustomerAccount({
      name: str(formData, "name"),
      email: str(formData, "email"),
      company: str(formData, "company"),
      organizationName: str(formData, "company") || `${str(formData, "name")}'s organization`,
      password: String(formData.get("password") ?? ""),
    });
    await prisma.user.update({
      where: { id: account.user.id },
      data: { isPlatformAdmin: formData.get("isPlatformAdmin") === "on" },
    });
    await assignPlanToUser(account.user.id, str(formData, "planId"));
    await audit({ actorType: "admin", action: "user.created", targetType: "user", targetId: account.user.id });
  } catch (err) {
    if (err instanceof SignupEmailExistsError) return;
    throw err;
  }
  revalidatePath("/users");
}

async function setUserStatus(formData: FormData, status: "active" | "suspended") {
  const id = uuidFromPublicId(str(formData, "id"), "user");
  await prisma.user.update({ where: { id }, data: { status } });
  await audit({ actorType: "admin", action: `user.${status}`, targetType: "user", targetId: id });
  revalidatePath("/users");
}
async function suspendUser(fd: FormData) { "use server"; await setUserStatus(fd, "suspended"); }
async function unsuspendUser(fd: FormData) { "use server"; await setUserStatus(fd, "active"); }

async function deleteUser(formData: FormData) {
  "use server";
  const id = uuidFromPublicId(str(formData, "id"), "user");
  const resources = await prisma.app.count({ where: { project: { organization: { ownerUserId: id } } } });
  const dbs = await prisma.database.count({ where: { project: { organization: { ownerUserId: id } } } });
  if (resources > 0 || dbs > 0) return; // not safe — surfaced as a disabled menu item
  await prisma.user.update({ where: { id }, data: { status: "deleted" } });
  await audit({ actorType: "admin", action: "user.deleted", targetType: "user", targetId: id });
  revalidatePath("/users");
}

export default async function UsersPage() {
  const since = monthStart();
  const [users, plans, usageRows, dbRows, bucketRows] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ownedOrganizations: {
          orderBy: { createdAt: "asc" },
          include: {
            subscriptions: {
              where: { status: { in: ["active", "trialing", "past_due"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { plan: true },
            },
          },
        },
        _count: { select: { orgMemberships: true, projectMemberships: true } },
      },
    }),
    prisma.plan.findMany({ where: { status: "active" }, orderBy: { priceCents: "asc" } }),
    prisma.usageEvent.groupBy({
      by: ["userId", "usageType"],
      where: { recordedAt: { gte: since }, userId: { not: null } },
      _sum: { quantity: true },
    }),
    prisma.database.findMany({
      where: { status: { not: "deleted" } },
      select: { currentSizeBytes: true, project: { select: { organization: { select: { ownerUserId: true } } } } },
    }),
    prisma.storageBucket.findMany({
      where: { status: { not: "deleted" } },
      select: { currentStorageBytes: true, project: { select: { organization: { select: { ownerUserId: true } } } } },
    }),
  ]);

  // Per-user flow usage from usage_events.
  const usageByUser = new Map<string, { vcpu: number; bwIn: number; bwOut: number }>();
  for (const r of usageRows) {
    if (!r.userId) continue;
    const u = usageByUser.get(r.userId) ?? { vcpu: 0, bwIn: 0, bwOut: 0 };
    const q = Number(r._sum.quantity ?? 0);
    if (r.usageType === "app_runtime_vcpu_seconds" || r.usageType === "build_vcpu_seconds") u.vcpu += q;
    if ((BANDWIDTH_IN_TYPES as readonly string[]).includes(r.usageType)) u.bwIn += q;
    if ((BANDWIDTH_OUT_TYPES as readonly string[]).includes(r.usageType)) u.bwOut += q;
    usageByUser.set(r.userId, u);
  }
  // Per-user storage from resource tables.
  const storageByUser = new Map<string, number>();
  for (const d of dbRows) {
    const owner = d.project.organization.ownerUserId;
    if (owner) storageByUser.set(owner, (storageByUser.get(owner) ?? 0) + Number(d.currentSizeBytes));
  }
  for (const b of bucketRows) {
    const owner = b.project.organization.ownerUserId;
    if (owner) storageByUser.set(owner, (storageByUser.get(owner) ?? 0) + Number(b.currentStorageBytes));
  }

  // Dashboard metrics.
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const realUsers = users.filter((u) => u.status !== "deleted");
  const cards = {
    total: realUsers.length,
    newWeek: realUsers.filter((u) => u.createdAt >= weekAgo).length,
    newMonth: realUsers.filter((u) => u.createdAt >= since).length,
    paying: 0,
    trial: 0,
    suspended: realUsers.filter((u) => u.status === "suspended").length,
    active: realUsers.filter((u) => u.status === "active").length,
  };
  for (const u of realUsers) {
    const sub = u.ownedOrganizations[0]?.subscriptions[0];
    if (sub?.status === "trialing") cards.trial++;
    else if (sub && (sub.plan.priceCents > 0)) cards.paying++;
  }

  // Signup graph — last 12 weeks.
  const weeks: { label: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(Date.now() - i * 7 * 86_400_000);
    const end = new Date(start.getTime() + 7 * 86_400_000);
    weeks.push({
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      count: realUsers.filter((u) => u.createdAt >= start && u.createdAt < end).length,
    });
  }

  // Top users by usage (vCPU-hours).
  const topUsers = realUsers
    .map((u) => ({ name: u.name ?? u.email, value: (usageByUser.get(u.id)?.vcpu ?? 0) / 3600 }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const rows: DTRow[] = realUsers.map((u) => {
    const publicUserId = formatPublicId("user", u.id);
    const sub = u.ownedOrganizations[0]?.subscriptions[0];
    const usage = usageByUser.get(u.id) ?? { vcpu: 0, bwIn: 0, bwOut: 0 };
    const storage = storageByUser.get(u.id) ?? 0;
    const billing = sub?.status === "trialing" ? "trial" : sub && sub.plan.priceCents > 0 ? "paying" : "free";
    return {
      id: publicUserId,
      href: `/users/${publicUserId}`,
      values: {
        user: `${u.name ?? ""} ${u.email}`,
        auth: u.authProvider,
        status: u.status,
        plan: sub?.plan.name ?? "none",
        billing,
        vcpu: usage.vcpu,
        storage,
      },
      cells: [
        <div key="u">
          <Link href={`/users/${publicUserId}`}><strong>{u.name ?? "—"}</strong></Link>
          <div className="small">{u.email}{u.isPlatformAdmin ? " · admin" : ""}</div>
        </div>,
        <Badge key="a" status={u.authProvider === "password" ? "muted" : "ok"} />,
        <Badge key="s" status={u.status} />,
        sub?.plan.name ?? <span className="small">none</span>,
        <Badge key="b" status={billing === "paying" ? "active" : billing === "trial" ? "trialing" : "muted"} />,
        `${u._count.orgMemberships} / ${u._count.projectMemberships}`,
        vcpuHours(usage.vcpu),
        bytes(storage),
        <span key="bw" className="small">↓{bytes(usage.bwIn)} ↑{bytes(usage.bwOut)}</span>,
        <span key="ll" className="small">{timeAgo(u.lastLoginAt)}</span>,
        <RowMenu key="m" label={u.email}>
          <Link href={`/users/${publicUserId}`}>View profile</Link>
          <Link href={`/users/${publicUserId}#billing`}>Edit / assign plan</Link>
          <Link href={`/users/${publicUserId}#activity`}>View audit logs</Link>
          <div className="sep" />
          {u.status === "suspended" ? (
            <form action={unsuspendUser}><input type="hidden" name="id" value={publicUserId} /><button>Unsuspend</button></form>
          ) : (
            <form action={suspendUser}><input type="hidden" name="id" value={publicUserId} /><button className="danger">Suspend</button></form>
          )}
          <form action={deleteUser}><input type="hidden" name="id" value={publicUserId} /><button className="danger">Delete (if no resources)</button></form>
        </RowMenu>,
      ],
    };
  });

  return (
    <>
      <div className="actionbar">
        <div>
          <h1 className="h1">Users</h1>
          <p className="sub">Customer accounts, plans, trial status, and per-user usage.</p>
        </div>
        <a className="btn" href="#new-user">+ Create user</a>
      </div>

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="users" tone="violet" label="Total users" value={cards.total} />
        <StatCard icon="activity" tone="blue" label="New this week" value={cards.newWeek} deltaNote={`${cards.newMonth} this month`} />
        <StatCard icon="revenue" tone="green" label="Paying users" value={cards.paying} />
        <StatCard icon="clock" tone="amber" label="Trial users" value={cards.trial} />
        <StatCard icon="check" tone="blue" label="Active users" value={cards.active} />
        <StatCard icon="power" tone="rose" label="Suspended" value={cards.suspended} />
      </div>

      <div className="split" style={{ marginBottom: 16 }}>
        <Panel title="User signups — last 12 weeks">
          <AreaChart points={weeks.map((w) => w.count)} labels={weeks.map((w) => w.label)} />
        </Panel>
        <Panel title="Top users by vCPU-hours">
          {topUsers.length === 0
            ? <div className="small">No metered usage yet.</div>
            : <BarChart items={topUsers} format={(n) => `${n.toFixed(1)}h`} />}
        </Panel>
      </div>

      <DataTable
        columns={[
          { key: "user", label: "User", sortable: true },
          { key: "auth", label: "Auth" },
          { key: "status", label: "Status", sortable: true },
          { key: "plan", label: "Plan", sortable: true },
          { key: "billing", label: "Billing", sortable: true },
          { key: "counts", label: "Orgs / Projects" },
          { key: "vcpu", label: "vCPU-hrs", sortable: true },
          { key: "storage", label: "Storage", sortable: true },
          { key: "bandwidth", label: "Bandwidth" },
          { key: "login", label: "Last login" },
          { key: "actions", label: "" },
        ]}
        rows={rows}
        filters={[
          { key: "status", label: "Status", options: ["active", "suspended"] },
          { key: "billing", label: "Billing", options: ["paying", "trial", "free"] },
          { key: "auth", label: "Auth", options: ["password", "google", "github"] },
        ]}
        searchPlaceholder="Search users by name or email…"
        emptyText="No users yet."
      />

      <Modal id="new-user" title="Create user">
        <form action={createUser}>
          <div className="form-grid">
            <div><label>Name</label><input name="name" required /></div>
            <div><label>Email</label><input name="email" type="email" required /></div>
            <div><label>Company (optional)</label><input name="company" /></div>
            <div><label>Password</label><input name="password" type="password" minLength={8} required /></div>
            <div><label>Plan</label>
              <select name="planId" defaultValue={plans[0]?.id ?? ""}>
                <option value="">No plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.hasTrial ? ` (trial ${p.trialDays}d)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="check" style={{ marginTop: 12 }}>
            <input type="checkbox" name="isPlatformAdmin" /> Platform admin
          </label>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" type="submit">Create user</button>
            <a href="#" className="btn secondary">Cancel</a>
          </div>
        </form>
      </Modal>
    </>
  );
}
