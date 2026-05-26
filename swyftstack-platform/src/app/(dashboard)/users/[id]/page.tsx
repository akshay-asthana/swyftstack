import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  audit, formatPublicId, prisma, hashPassword, FEATURE_KEYS, LIMIT_KEYS, uuidFromPublicId,
} from "swyftstack-shared";
import {
  Badge, bytes, Panel, KeyValue, Table, StatCard, Breadcrumbs, EmptyState,
  timeAgo, MiniStat,
} from "@/components/ui";
import { Tabs, ConfirmButton } from "@/components/client";
import { assignPlanToUser, activeSubscriptionForUser } from "@/lib/user-admin";
import { aggregateForUser, monthStart, vcpuHours } from "@/lib/stats";

export const dynamic = "force-dynamic";

function str(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}
const userHref = (id: string) => `/users/${formatPublicId("user", id)}`;
const orgHref = (id: string) => `/organizations/${formatPublicId("organization", id)}`;
const projectHref = (id: string) => `/projects/${formatPublicId("project", id)}`;
function money(cents: number | null | undefined): string {
  return cents == null ? "—" : `$${(cents / 100).toFixed(2)}`;
}

// ---- server actions ----------------------------------------------------
async function updateUser(formData: FormData) {
  "use server";
  const id = uuidFromPublicId(str(formData, "id"), "user");
  const password = String(formData.get("password") ?? "");
  await prisma.user.update({
    where: { id },
    data: {
      name: str(formData, "name") || null,
      status: str(formData, "status") as "active" | "suspended" | "deleted",
      isPlatformAdmin: formData.get("isPlatformAdmin") === "on",
      passwordLoginEnabled: formData.get("passwordLoginEnabled") === "on",
      ...(password ? { passwordHash: hashPassword(password) } : {}),
    },
  });
  await audit({ actorType: "admin", action: "user.edited", targetType: "user", targetId: id });
  revalidatePath(userHref(id));
}

async function assignPlan(formData: FormData) {
  "use server";
  const id = uuidFromPublicId(str(formData, "id"), "user");
  await assignPlanToUser(id, str(formData, "planId"));
  await audit({ actorType: "admin", action: "user.plan_assigned", targetType: "user", targetId: id });
  revalidatePath(userHref(id));
}

async function endTrial(formData: FormData) {
  "use server";
  const id = uuidFromPublicId(str(formData, "id"), "user");
  const subId = str(formData, "subId");
  await prisma.subscription.update({
    where: { id: subId },
    data: { status: "active", billingPhase: "regular", trialEndAt: new Date() },
  });
  await audit({ actorType: "admin", action: "user.trial_ended", targetType: "user", targetId: id });
  revalidatePath(userHref(id));
}

async function saveLimitOverride(formData: FormData) {
  "use server";
  const userId = uuidFromPublicId(str(formData, "id"), "user");
  const limitKey = str(formData, "limitKey");
  const raw = str(formData, "limitValue");
  if (!limitKey) return;
  await prisma.limitOverride.upsert({
    where: { scopeType_scopeId_limitKey: { scopeType: "user", scopeId: userId, limitKey } },
    update: { limitValue: raw ? BigInt(raw) : null, reason: str(formData, "reason") || null },
    create: {
      scopeType: "user", scopeId: userId, limitKey,
      limitValue: raw ? BigInt(raw) : null, reason: str(formData, "reason") || null,
    },
  });
  await audit({ actorType: "admin", action: "user.limit_override", targetType: "user", targetId: userId });
  revalidatePath(userHref(userId));
}

async function deleteLimitOverride(formData: FormData) {
  "use server";
  const userId = uuidFromPublicId(str(formData, "id"), "user");
  await prisma.limitOverride.delete({ where: { id: str(formData, "overrideId") } }).catch(() => undefined);
  revalidatePath(userHref(userId));
}

async function saveFeatureOverride(formData: FormData) {
  "use server";
  const userId = uuidFromPublicId(str(formData, "id"), "user");
  const featureKey = str(formData, "featureKey");
  if (!featureKey) return;
  await prisma.featureOverride.upsert({
    where: { scopeType_scopeId_featureKey: { scopeType: "user", scopeId: userId, featureKey } },
    update: { enabled: formData.get("enabled") === "on", reason: str(formData, "reason") || null },
    create: {
      scopeType: "user", scopeId: userId, featureKey,
      enabled: formData.get("enabled") === "on", reason: str(formData, "reason") || null,
    },
  });
  await audit({ actorType: "admin", action: "user.feature_override", targetType: "user", targetId: userId });
  revalidatePath(userHref(userId));
}

async function deleteFeatureOverride(formData: FormData) {
  "use server";
  const userId = uuidFromPublicId(str(formData, "id"), "user");
  await prisma.featureOverride.delete({ where: { id: str(formData, "overrideId") } }).catch(() => undefined);
  revalidatePath(userHref(userId));
}

// ---- page --------------------------------------------------------------
export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const userId = uuidFromPublicId(params.id, "user");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ownedOrganizations: { include: { _count: { select: { projects: true, members: true } } } },
      orgMemberships: { include: { organization: true } },
      projectMemberships: { include: { project: { include: { organization: true } } } },
      authAccounts: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 10 },
      loginEvents: { orderBy: { createdAt: "desc" }, take: 15 },
    },
  });
  if (!user) notFound();
  const userPublicId = formatPublicId("user", user.id);

  const [sub, plans, agg, activity, limitOverrides, featureOverrides, notifications, deliveries, prefs] = await Promise.all([
    activeSubscriptionForUser(user.id),
    prisma.plan.findMany({ where: { status: "active" }, orderBy: { priceCents: "asc" } }),
    aggregateForUser(user.id, monthStart()),
    prisma.auditLog.findMany({ where: { actorUserId: user.id }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.limitOverride.findMany({ where: { scopeType: "user", scopeId: user.id } }),
    prisma.featureOverride.findMany({ where: { scopeType: "user", scopeId: user.id } }),
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.notificationDelivery.findMany({
      where: { channel: "email", notification: { userId: user.id } },
      include: { notification: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notificationPreference.findUnique({ where: { userId: user.id } }),
  ]);

  const billingPhase = sub?.billingPhase ?? "—";
  const projects = user.projectMemberships;

  // ---- Tab: Overview ----
  const overviewTab = (
    <div className="split-even">
      <Panel title="Account">
        <KeyValue
          rows={[
            ["Name", user.name ?? "—"],
            ["Email", user.email],
            ["Status", <Badge key="s" status={user.status} />],
            ["Auth provider", user.authProvider],
            ["Email verified", user.emailVerified ? "yes" : "no"],
            ["Platform admin", user.isPlatformAdmin ? "yes" : "no"],
            ["Created", user.createdAt.toISOString().slice(0, 16).replace("T", " ")],
            ["Last login", timeAgo(user.lastLoginAt)],
            ["Last activity", timeAgo(user.lastActivityAt)],
          ]}
        />
      </Panel>
      <Panel title="Subscription">
        <KeyValue
          rows={[
            ["Plan", sub?.plan.name ?? "none"],
            ["Status", sub ? <Badge key="s" status={sub.status} /> : "—"],
            ["Billing phase", billingPhase],
            ["Trial ends", timeAgo(sub?.trialEndAt)],
            ["Trial price", money(sub?.trialPriceCents)],
            ["Regular price", money(sub?.regularPriceCents ?? sub?.plan.priceCents)],
            ["Organization", sub?.organization.name ?? "—"],
          ]}
        />
      </Panel>
    </div>
  );

  // ---- Tab: Plan & billing ----
  const billingTab = (
    <div className="split">
      <div>
        <Panel title="Edit account">
          <form action={updateUser}>
            <input type="hidden" name="id" value={userPublicId} />
            <div className="form-grid">
              <div><label>Name</label><input name="name" defaultValue={user.name ?? ""} /></div>
              <div><label>New password</label><input name="password" type="password" minLength={8} /></div>
              <div><label>Status</label>
                <select name="status" defaultValue={user.status}>
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="deleted">deleted</option>
                </select>
              </div>
            </div>
            <div className="row" style={{ marginTop: 10, gap: 18 }}>
              <label className="check"><input type="checkbox" name="isPlatformAdmin" defaultChecked={user.isPlatformAdmin} /> Platform admin</label>
              <label className="check"><input type="checkbox" name="passwordLoginEnabled" defaultChecked={user.passwordLoginEnabled} /> Password login enabled</label>
            </div>
            <div style={{ marginTop: 14 }}><button className="btn" type="submit">Save account</button></div>
          </form>
        </Panel>
        <Panel title="Assign / change plan">
          <form action={assignPlan}>
            <input type="hidden" name="id" value={userPublicId} />
            <label>Plan</label>
            <select name="planId" defaultValue={sub?.planId ?? ""}>
              <option value="">No plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {money(p.priceCents)}/mo{p.hasTrial ? ` · trial ${money(p.trialPriceCents)} for ${p.trialDays}d` : ""}
                </option>
              ))}
            </select>
            <div style={{ marginTop: 12 }}><button className="btn" type="submit">Apply plan</button></div>
          </form>
          {sub?.status === "trialing" && (
            <form action={endTrial} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={userPublicId} />
              <input type="hidden" name="subId" value={sub.id} />
              <button className="btn secondary" type="submit">End trial now</button>
            </form>
          )}
        </Panel>
      </div>
      <Panel title="Billing phase">
        <KeyValue
          rows={[
            ["Current phase", billingPhase],
            ["Trial started", sub?.trialStartAt ? sub.trialStartAt.toISOString().slice(0, 10) : "—"],
            ["Trial ends", sub?.trialEndAt ? sub.trialEndAt.toISOString().slice(0, 10) : "—"],
            ["Trial price", money(sub?.trialPriceCents)],
            ["Next billing price", money(sub?.regularPriceCents ?? sub?.plan.priceCents)],
            ["Period end", sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString().slice(0, 10) : "—"],
            ["Payment provider", sub?.provider ?? "—"],
            ["Past due / cancelled", sub?.status === "past_due" || sub?.status === "cancelled" ? sub.status : "—"],
          ]}
        />
      </Panel>
    </div>
  );

  // ---- Tab: Usage ----
  const usageTab = (
    <>
      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="cpu" tone="violet" label="vCPU-hours" value={vcpuHours(agg.vcpuSeconds)} />
        <StatCard icon="rocket" tone="blue" label="Build vCPU-hours" value={vcpuHours(agg.buildVcpuSeconds)} />
        <StatCard icon="arrowDown" tone="green" label="Bandwidth in" value={bytes(agg.bandwidthInBytes)} />
        <StatCard icon="arrowUp" tone="amber" label="Bandwidth out" value={bytes(agg.bandwidthOutBytes)} />
        <StatCard icon="database" tone="blue" label="DB storage" value={bytes(agg.dbStorageBytes)} />
        <StatCard icon="storage" tone="violet" label="Object storage" value={bytes(agg.objectStorageBytes)} />
        <StatCard icon="globe" tone="rose" label="Egress used" value={bytes(agg.egressUsedBytes)} />
      </div>
      <Panel title="Resource counts">
        <div className="grid compact">
          <MiniStat k="Projects" v={agg.projects} />
          <MiniStat k="Apps" v={agg.apps} />
          <MiniStat k="Databases" v={agg.databases} />
          <MiniStat k="Buckets" v={agg.buckets} />
          <MiniStat k="Backups" v={agg.backups} />
        </div>
      </Panel>
    </>
  );

  // ---- Tab: Organizations ----
  const orgsTab = (
    <Panel title="Organization memberships" flush>
      {user.orgMemberships.length === 0 ? (
        <EmptyState icon="org" title="Not a member of any organization" />
      ) : (
        <Table
          columns={["Organization", "Role", "Status", ""]}
          rows={user.orgMemberships.map((m) => [
            m.organization.name,
            <Badge key="r" status="muted" />,
            <Badge key="s" status={m.organization.status} />,
            <Link key="l" className="btn sm secondary" href={orgHref(m.organization.id)}>Open</Link>,
          ])}
        />
      )}
    </Panel>
  );

  // ---- Tab: Projects ----
  const projectsTab = (
    <Panel title="Project memberships" flush>
      {projects.length === 0 ? (
        <EmptyState icon="projects" title="No project memberships" />
      ) : (
        <Table
          columns={["Project", "Organization", "Role", "Status", ""]}
          rows={projects.map((m) => [
            m.project.name,
            m.project.organization.name,
            m.role,
            <Badge key="s" status={m.project.status} />,
            <Link key="l" className="btn sm secondary" href={projectHref(m.project.id)}>Open</Link>,
          ])}
        />
      )}
    </Panel>
  );

  // ---- Tab: Activity ----
  const activityTab = (
    <Panel title="Activity & audit log" flush>
      {activity.length === 0 ? (
        <EmptyState icon="activity" title="No recorded activity" />
      ) : (
        <Table
          columns={["Time", "Action", "Target", "Detail"]}
          rows={activity.map((a) => [
            a.createdAt.toISOString().slice(0, 19).replace("T", " "),
            a.action,
            a.targetType ?? "—",
            <span key="d" className="small">{JSON.stringify(a.metadata)}</span>,
          ])}
        />
      )}
    </Panel>
  );

  // ---- Tab: Notifications ----
  const notificationsTab = (
    <div className="split">
      <div>
        <Panel title={`Recent notifications (${notifications.length})`} flush>
          <Table
            columns={["Created", "Type", "Severity", "Title", "Read"]}
            rows={notifications.map((n) => [
              timeAgo(n.createdAt),
              n.type,
              <Badge key="s" status={n.severity} />,
              n.title,
              n.readAt ? timeAgo(n.readAt) : "unread",
            ])}
          />
        </Panel>
      </div>
      <div>
        <Panel title="Notification preferences">
          <KeyValue
            rows={[
              ["Usage threshold email", prefs?.usageThresholdEmail === false ? "disabled" : "enabled"],
              ["Usage threshold in-app", prefs?.usageThresholdInApp === false ? "disabled" : "enabled"],
              ["Welcome email", prefs?.welcomeEmail === false ? "disabled" : "enabled"],
              ["Marketing email", prefs?.marketingEmail ? "enabled" : "disabled"],
            ]}
          />
        </Panel>
        <Panel title={`Email deliveries (${deliveries.length})`} flush>
          <Table
            columns={["Created", "Type", "Status", "Provider", "Attempts", "Error"]}
            rows={deliveries.map((d) => [
              timeAgo(d.createdAt),
              d.notification.type,
              <Badge key="s" status={d.status} />,
              d.provider ?? "—",
              d.attempts,
              d.errorMessage ?? "—",
            ])}
          />
        </Panel>
      </div>
    </div>
  );

  // ---- Tab: Security ----
  const securityTab = (
    <>
      <div className="split-even">
        <Panel title="Authentication">
          <KeyValue
            rows={[
              ["Primary provider", user.authProvider],
              ["Password login", user.passwordLoginEnabled ? "enabled" : "disabled"],
              ["Email verified", user.emailVerified ? "yes" : "no"],
              ["Failed login attempts", user.failedLoginCount],
              ["Last login IP", user.lastLoginIp ?? "—"],
            ]}
          />
        </Panel>
        <Panel title={`Linked OAuth accounts (${user.authAccounts.length})`} flush>
          <Table
            columns={["Provider", "Account", "Linked"]}
            rows={user.authAccounts.map((a) => [
              a.provider, a.email ?? a.providerAccountId, timeAgo(a.createdAt),
            ])}
          />
        </Panel>
      </div>
      <Panel title={`Sessions (${user.sessions.length})`} flush>
        <Table
          columns={["App", "IP", "Created", "Last seen", "Status"]}
          rows={user.sessions.map((s) => [
            s.app, s.ipAddress ?? "—", timeAgo(s.createdAt), timeAgo(s.lastSeenAt),
            <Badge key="s" status={s.revokedAt ? "disabled" : s.expiresAt < new Date() ? "expired" : "active"} />,
          ])}
        />
      </Panel>
      <Panel title="Login history (IP history)" flush>
        <Table
          columns={["Time", "Provider", "Result", "IP", "Reason"]}
          rows={user.loginEvents.map((e) => [
            e.createdAt.toISOString().slice(0, 19).replace("T", " "),
            e.provider,
            <Badge key="r" status={e.success ? "active" : "failed"} />,
            e.ipAddress ?? "—",
            e.reason ?? "—",
          ])}
        />
      </Panel>
    </>
  );

  // ---- Tab: Overrides ----
  const overridesTab = (
    <div className="split">
      <div>
        <Panel title={`Limit overrides (${limitOverrides.length})`} flush>
          <Table
            columns={["Limit", "Value", "Reason", ""]}
            rows={limitOverrides.map((o) => [
              o.limitKey,
              o.limitValue == null ? "unlimited" : String(o.limitValue),
              o.reason ?? "—",
              <form key="d" action={deleteLimitOverride}>
                <input type="hidden" name="id" value={userPublicId} />
                <input type="hidden" name="overrideId" value={o.id} />
                <ConfirmButton message="Remove this limit override?" className="btn sm danger">Remove</ConfirmButton>
              </form>,
            ])}
          />
        </Panel>
        <Panel title={`Feature overrides (${featureOverrides.length})`} flush>
          <Table
            columns={["Feature", "Enabled", "Reason", ""]}
            rows={featureOverrides.map((o) => [
              o.featureKey,
              <Badge key="e" status={o.enabled ? "active" : "disabled"} />,
              o.reason ?? "—",
              <form key="d" action={deleteFeatureOverride}>
                <input type="hidden" name="id" value={userPublicId} />
                <input type="hidden" name="overrideId" value={o.id} />
                <ConfirmButton message="Remove this feature override?" className="btn sm danger">Remove</ConfirmButton>
              </form>,
            ])}
          />
        </Panel>
      </div>
      <div>
        <Panel title="Add limit override">
          <form action={saveLimitOverride}>
            <input type="hidden" name="id" value={userPublicId} />
            <label>Limit key</label>
            <select name="limitKey">{LIMIT_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            <label>Value (blank = unlimited)</label>
            <input name="limitValue" placeholder="e.g. 20" />
            <label>Reason</label>
            <input name="reason" />
            <div style={{ marginTop: 12 }}><button className="btn" type="submit">Save limit override</button></div>
          </form>
        </Panel>
        <Panel title="Add feature override">
          <form action={saveFeatureOverride}>
            <input type="hidden" name="id" value={userPublicId} />
            <label>Feature key</label>
            <select name="featureKey">{FEATURE_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            <label className="check" style={{ marginTop: 10 }}>
              <input type="checkbox" name="enabled" defaultChecked /> Enabled
            </label>
            <label>Reason</label>
            <input name="reason" />
            <div style={{ marginTop: 12 }}><button className="btn" type="submit">Save feature override</button></div>
          </form>
        </Panel>
      </div>
    </div>
  );

  return (
    <>
      <Breadcrumbs items={[{ label: "Users", href: "/users" }, { label: user.name ?? user.email }]} />
      <div className="actionbar">
        <div>
          <h1 className="h1">{user.name ?? user.email}</h1>
          <p className="sub">{user.email} · <Badge status={user.status} /> · {sub?.plan.name ?? "no plan"}</p>
        </div>
      </div>

      <div className="grid compact" style={{ marginBottom: 16 }}>
        <StatCard icon="cpu" tone="violet" label="vCPU-hours (mo)" value={vcpuHours(agg.vcpuSeconds)} />
        <StatCard icon="database" tone="blue" label="DB storage" value={bytes(agg.dbStorageBytes)} />
        <StatCard icon="storage" tone="green" label="Object storage" value={bytes(agg.objectStorageBytes)} />
        <StatCard icon="projects" tone="amber" label="Projects" value={agg.projects} />
        <StatCard icon="apps" tone="rose" label="Apps" value={agg.apps} />
      </div>

      <Tabs
        tabs={[
          { id: "overview", label: "Overview", icon: "user", content: overviewTab },
          { id: "billing", label: "Plan & billing", icon: "plans", content: billingTab },
          { id: "usage", label: "Usage", icon: "usage", content: usageTab },
          { id: "orgs", label: "Organizations", icon: "org", content: orgsTab },
          { id: "projects", label: "Projects", icon: "projects", content: projectsTab },
          { id: "activity", label: "Activity", icon: "activity", content: activityTab },
          { id: "notifications", label: "Notifications", icon: "bell", content: notificationsTab },
          { id: "security", label: "Audit & security", icon: "shield", content: securityTab },
          { id: "overrides", label: "Overrides", icon: "settings", content: overridesTab },
        ]}
      />
    </>
  );
}
