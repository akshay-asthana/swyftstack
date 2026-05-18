import { revalidatePath } from "next/cache";
import { audit, FEATURE_KEYS, prisma } from "quickdock-shared";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function intOrNull(formData: FormData, key: string): number | null {
  const value = str(formData, key);
  return value ? Math.round(Number(value)) : null;
}

function bigOrNull(formData: FormData, key: string): bigint | null {
  const value = str(formData, key);
  return value ? BigInt(Math.round(Number(value))) : null;
}

type PlanStatusValue = "active" | "archived";

function planStatus(formData: FormData): PlanStatusValue {
  return str(formData, "status") === "archived" ? "archived" : "active";
}

function planLimitData(formData: FormData) {
  return {
    maxProjects: intOrNull(formData, "maxProjects"),
    maxDatabases: intOrNull(formData, "maxDatabases"),
    maxDatabaseStorageBytes: bigOrNull(formData, "maxDatabaseStorageBytes"),
    maxObjectStorageBytes: bigOrNull(formData, "maxObjectStorageBytes"),
    maxEgressBytes: bigOrNull(formData, "maxEgressBytes"),
    maxVcpuSeconds: bigOrNull(formData, "maxVcpuSeconds"),
    maxBuildVcpuSeconds: bigOrNull(formData, "maxBuildVcpuSeconds"),
    dailyDbBackups: intOrNull(formData, "dailyDbBackups"),
    backupRetentionHours: intOrNull(formData, "backupRetentionHours"),
    maxTeamMembers: intOrNull(formData, "maxTeamMembers"),
    maxCustomDomains: intOrNull(formData, "maxCustomDomains"),
  };
}

async function syncFeatures(planId: string, formData: FormData) {
  await Promise.all(
    FEATURE_KEYS.map((featureKey) =>
      prisma.planFeature.upsert({
        where: { planId_featureKey: { planId, featureKey } },
        update: { enabled: formData.get(`feature:${featureKey}`) === "on" },
        create: {
          planId,
          featureKey,
          enabled: formData.get(`feature:${featureKey}`) === "on",
        },
      }),
    ),
  );
}

async function createPlan(formData: FormData) {
  "use server";
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);
  const plan = await prisma.plan.create({
    data: {
      name,
      slug,
      priceCents: Math.round(Number(formData.get("priceCents") ?? 0)),
      currency: str(formData, "currency") || "USD",
      billingInterval: str(formData, "billingInterval") || "monthly",
      status: planStatus(formData),
      limits: { create: planLimitData(formData) },
    },
  });
  await syncFeatures(plan.id, formData);
  await audit({ actorType: "admin", action: "plan.created", targetType: "plan", targetId: plan.id });
  revalidatePath("/plans");
}

async function savePlan(formData: FormData) {
  "use server";
  const planId = str(formData, "planId");
  const name = str(formData, "name");
  const slug = slugify(str(formData, "slug") || name);

  await prisma.plan.update({
    where: { id: planId },
    data: {
      name,
      slug,
      priceCents: Math.round(Number(formData.get("priceCents") ?? 0)),
      currency: str(formData, "currency") || "USD",
      billingInterval: str(formData, "billingInterval") || "monthly",
      status: planStatus(formData),
    },
  });
  await prisma.planLimit.upsert({
    where: { planId },
    update: planLimitData(formData),
    create: { planId, ...planLimitData(formData) },
  });
  await syncFeatures(planId, formData);
  await audit({ actorType: "admin", action: "plan.edited", targetType: "plan", targetId: planId });
  revalidatePath("/plans");
}

function LimitInputs({ limits }: { limits?: {
  maxProjects?: number | null;
  maxDatabases?: number | null;
  maxDatabaseStorageBytes?: bigint | null;
  maxObjectStorageBytes?: bigint | null;
  maxEgressBytes?: bigint | null;
  maxVcpuSeconds?: bigint | null;
  maxBuildVcpuSeconds?: bigint | null;
  dailyDbBackups?: number | null;
  backupRetentionHours?: number | null;
  maxTeamMembers?: number | null;
  maxCustomDomains?: number | null;
} | null }) {
  return (
    <div className="grid compact" style={{ marginTop: 12 }}>
      <div><label>Max projects</label><input name="maxProjects" defaultValue={limits?.maxProjects ?? ""} /></div>
      <div><label>Max databases</label><input name="maxDatabases" defaultValue={limits?.maxDatabases ?? ""} /></div>
      <div><label>DB storage bytes</label><input name="maxDatabaseStorageBytes" defaultValue={String(limits?.maxDatabaseStorageBytes ?? "")} /></div>
      <div><label>Object storage bytes</label><input name="maxObjectStorageBytes" defaultValue={String(limits?.maxObjectStorageBytes ?? "")} /></div>
      <div><label>Egress bytes</label><input name="maxEgressBytes" defaultValue={String(limits?.maxEgressBytes ?? "")} /></div>
      <div><label>Runtime vCPU-sec</label><input name="maxVcpuSeconds" defaultValue={String(limits?.maxVcpuSeconds ?? "")} /></div>
      <div><label>Build vCPU-sec</label><input name="maxBuildVcpuSeconds" defaultValue={String(limits?.maxBuildVcpuSeconds ?? "")} /></div>
      <div><label>Daily DB backups</label><input name="dailyDbBackups" defaultValue={limits?.dailyDbBackups ?? ""} /></div>
      <div><label>Backup retention hours</label><input name="backupRetentionHours" defaultValue={limits?.backupRetentionHours ?? ""} /></div>
      <div><label>Team members</label><input name="maxTeamMembers" defaultValue={limits?.maxTeamMembers ?? ""} /></div>
      <div><label>Custom domains</label><input name="maxCustomDomains" defaultValue={limits?.maxCustomDomains ?? ""} /></div>
    </div>
  );
}

function FeatureChecks({ enabled }: { enabled: Set<string> }) {
  return (
    <div className="check-grid">
      {FEATURE_KEYS.map((key) => (
        <label className="check" key={key}>
          <input type="checkbox" name={`feature:${key}`} defaultChecked={enabled.has(key)} />
          {key.replaceAll("_", " ")}
        </label>
      ))}
    </div>
  );
}

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: [{ status: "asc" }, { priceCents: "asc" }],
    include: { limits: true, features: true, _count: { select: { subscriptions: true } } },
  });

  return (
    <>
      <h1 className="h1">Plans</h1>
      <p className="sub">Create and tune commercial plans, limits, and feature availability.</p>

      <form action={createPlan} className="card" style={{ marginBottom: 16 }}>
        <div className="panel-title">Create Plan</div>
        <div className="form-grid">
          <div><label>Name</label><input name="name" required /></div>
          <div><label>Slug</label><input name="slug" placeholder="growth" /></div>
          <div><label>Price cents</label><input name="priceCents" defaultValue="0" /></div>
          <div><label>Currency</label><input name="currency" defaultValue="USD" /></div>
          <div><label>Billing interval</label><input name="billingInterval" defaultValue="monthly" /></div>
          <div><label>Status</label>
            <select name="status" defaultValue="active">
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </div>
        </div>
        <LimitInputs />
        <FeatureChecks enabled={new Set(FEATURE_KEYS)} />
        <div style={{ marginTop: 14 }}><button className="btn">Create plan</button></div>
      </form>

      {plans.map((p) => {
        const enabled = new Set(p.features.filter((f) => f.enabled).map((f) => f.featureKey));
        return (
          <form key={p.id} action={savePlan} className="card" style={{ marginBottom: 16 }}>
            <input type="hidden" name="planId" value={p.id} />
            <div className="row">
              <strong style={{ fontSize: 16 }}>{p.name}</strong>
              <Badge status={p.status} />
              <span className="small">{p._count.subscriptions} subscriptions</span>
              <span className="right small">{p.slug}</span>
            </div>
            <div className="form-grid">
              <div><label>Name</label><input name="name" defaultValue={p.name} required /></div>
              <div><label>Slug</label><input name="slug" defaultValue={p.slug} required /></div>
              <div><label>Price cents</label><input name="priceCents" defaultValue={p.priceCents} /></div>
              <div><label>Currency</label><input name="currency" defaultValue={p.currency} /></div>
              <div><label>Billing interval</label><input name="billingInterval" defaultValue={p.billingInterval} /></div>
              <div><label>Status</label>
                <select name="status" defaultValue={p.status}>
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
              </div>
            </div>
            <LimitInputs limits={p.limits} />
            <FeatureChecks enabled={enabled} />
            <div style={{ marginTop: 14 }}><button className="btn">Save plan</button></div>
          </form>
        );
      })}
    </>
  );
}
