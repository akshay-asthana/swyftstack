import { revalidatePath } from "next/cache";
import {
  audit,
  createPasswordCustomerAccount,
  hashPassword,
  prisma,
  SignupEmailExistsError,
} from "quickdock-shared";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

async function ensureOwnedWorkspace(userId: string, displayName: string) {
  const existing = await prisma.organization.findFirst({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  return prisma.organization.create({
    data: {
      name: displayName ? `${displayName}'s workspace` : "User workspace",
      ownerUserId: userId,
      members: { create: { userId, role: "owner" } },
      projects: {
        create: {
          name: "Default project",
          slug: "default",
          region: "local",
          createdBy: userId,
          members: { create: { userId, role: "owner" } },
        },
      },
    },
  });
}

async function assignPlanToUser(userId: string, planId: string) {
  if (!planId) return;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const organization = await ensureOwnedWorkspace(userId, user.name ?? user.email);
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.subscription.updateMany({
    where: {
      organizationId: organization.id,
      status: { in: ["active", "trialing", "past_due"] },
    },
    data: { status: "cancelled", cancelAtPeriodEnd: false },
  });
  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      planId,
      status: "active",
      provider: "manual",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
}

async function createUser(formData: FormData) {
  "use server";
  try {
    const account = await createPasswordCustomerAccount({
      name: str(formData, "name"),
      email: str(formData, "email"),
      company: str(formData, "company"),
      password: String(formData.get("password") ?? ""),
    });
    await prisma.user.update({
      where: { id: account.user.id },
      data: { isPlatformAdmin: formData.get("isPlatformAdmin") === "on" },
    });
    await assignPlanToUser(account.user.id, str(formData, "planId"));
    await audit({
      actorType: "admin",
      action: "user.created",
      targetType: "user",
      targetId: account.user.id,
    });
  } catch (err) {
    if (err instanceof SignupEmailExistsError) return;
    throw err;
  }
  revalidatePath("/users");
}

async function updateUser(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const password = String(formData.get("password") ?? "");
  const data: {
    name: string | null;
    status: "active" | "suspended" | "deleted";
    isPlatformAdmin: boolean;
    passwordHash?: string;
  } = {
    name: str(formData, "name") || null,
    status: str(formData, "status") as "active" | "suspended" | "deleted",
    isPlatformAdmin: formData.get("isPlatformAdmin") === "on",
  };
  if (password) data.passwordHash = hashPassword(password);

  await prisma.user.update({ where: { id }, data });
  await assignPlanToUser(id, str(formData, "planId"));
  await audit({ actorType: "admin", action: "user.edited", targetType: "user", targetId: id });
  revalidatePath("/users");
}

async function toggleSuspend(formData: FormData) {
  "use server";
  const id = str(formData, "id");
  const u = await prisma.user.findUniqueOrThrow({ where: { id } });
  const next = u.status === "suspended" ? "active" : "suspended";
  await prisma.user.update({ where: { id }, data: { status: next } });
  await audit({ actorType: "admin", action: `user.${next}`, targetType: "user", targetId: id });
  revalidatePath("/users");
}

export default async function UsersPage() {
  const [users, plans] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        ownedOrganizations: {
          orderBy: { createdAt: "asc" },
          include: {
            subscriptions: {
              where: { status: "active" },
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
  ]);

  return (
    <>
      <h1 className="h1">Users</h1>
      <p className="sub">Create accounts, control access, and assign workspace plans.</p>

      <div className="split">
        <Table
          columns={["Email", "Name", "Admin", "Status", "Plan", "Orgs", "Projects", "Action"]}
          rows={users.map((u) => {
            const activePlan = u.ownedOrganizations[0]?.subscriptions[0]?.plan;
            return [
              <strong key="email">{u.email}</strong>,
              u.name ?? "—",
              u.isPlatformAdmin ? "yes" : "—",
              <Badge key="s" status={u.status} />,
              activePlan?.name ?? "—",
              u._count.orgMemberships,
              u._count.projectMemberships,
              <form key="a" action={toggleSuspend}>
                <input type="hidden" name="id" value={u.id} />
                <button className="btn secondary">
                  {u.status === "suspended" ? "Unsuspend" : "Suspend"}
                </button>
              </form>,
            ];
          })}
        />

        <div>
          <form action={createUser} className="card">
            <div className="panel-title">Create User</div>
            <div className="form-grid">
              <div><label>Name</label><input name="name" required /></div>
              <div><label>Email</label><input name="email" type="email" required /></div>
              <div><label>Company</label><input name="company" /></div>
              <div><label>Password</label><input name="password" type="password" minLength={8} required /></div>
              <div><label>Plan</label>
                <select name="planId" defaultValue={plans[0]?.id ?? ""}>
                  {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <label className="check" style={{ marginTop: 12 }}>
              <input type="checkbox" name="isPlatformAdmin" /> Platform admin
            </label>
            <div style={{ marginTop: 14 }}><button className="btn">Create user</button></div>
          </form>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="panel-title">Edit User</div>
            <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
              {users.map((u) => {
                const activePlan = u.ownedOrganizations[0]?.subscriptions[0]?.plan;
                return (
                  <form key={u.id} action={updateUser} className="panel" style={{ marginBottom: 0 }}>
                    <input type="hidden" name="id" value={u.id} />
                    <div className="panel-head">
                      <strong>{u.email}</strong>
                      <Badge status={u.status} />
                    </div>
                    <div style={{ padding: 14 }}>
                      <div className="form-grid">
                        <div><label>Name</label><input name="name" defaultValue={u.name ?? ""} /></div>
                        <div><label>New password</label><input name="password" type="password" minLength={8} /></div>
                        <div><label>Status</label>
                          <select name="status" defaultValue={u.status}>
                            <option value="active">active</option>
                            <option value="suspended">suspended</option>
                            <option value="deleted">deleted</option>
                          </select>
                        </div>
                        <div><label>Plan</label>
                          <select name="planId" defaultValue={activePlan?.id ?? ""}>
                            <option value="">No plan</option>
                            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <label className="check" style={{ marginTop: 12 }}>
                        <input type="checkbox" name="isPlatformAdmin" defaultChecked={u.isPlatformAdmin} /> Platform admin
                      </label>
                      <div style={{ marginTop: 14 }}><button className="btn">Save user</button></div>
                    </div>
                  </form>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
