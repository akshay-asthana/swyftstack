import { revalidatePath } from "next/cache";
import { audit, FEATURE_KEYS, prisma } from "swyftstack-shared";
import { Badge, bytes, Table } from "@/components/ui";
import { PlanResourceEditor } from "@/components/plan-resource-editor";

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

// §13 — trial pricing. A trial can be free or discounted and last any number
// of days; billing reverts to the regular monthly price afterwards.
function planTrialData(formData: FormData) {
  const hasTrial = formData.get("hasTrial") === "on";
  return {
    description: str(formData, "description") || null,
    hasTrial,
    trialPriceCents: hasTrial ? intOrNull(formData, "trialPriceCents") ?? 0 : null,
    trialDays: hasTrial ? intOrNull(formData, "trialDays") : null,
    trialRequiresPaymentMethod: formData.get("trialRequiresPaymentMethod") === "on",
  };
}

// §9 — limit inputs gated by their resource toggle are `disabled` when the
// resource is off, so they arrive absent here and resolve to null (unlimited).
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
      ...planTrialData(formData),
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
      ...planTrialData(formData),
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

type PlanLimits = {
  maxProjects: number | null;
  maxDatabases: number | null;
  maxDatabaseStorageBytes: bigint | null;
  maxObjectStorageBytes: bigint | null;
  maxEgressBytes: bigint | null;
  maxVcpuSeconds: bigint | null;
  maxBuildVcpuSeconds: bigint | null;
  dailyDbBackups: number | null;
  backupRetentionHours: number | null;
  maxTeamMembers: number | null;
  maxCustomDomains: number | null;
};

const LIMIT_KEYS = [
  "maxProjects", "maxDatabases", "maxDatabaseStorageBytes", "maxObjectStorageBytes",
  "maxEgressBytes", "maxVcpuSeconds", "maxBuildVcpuSeconds", "dailyDbBackups",
  "backupRetentionHours", "maxTeamMembers", "maxCustomDomains",
] as const;

/** Limit values as strings (RSC props must not carry BigInt). "" = unlimited. */
function limitValues(limits: PlanLimits | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of LIMIT_KEYS) {
    const v = limits ? limits[k] : null;
    out[k] = v === null || v === undefined ? "" : String(v);
  }
  return out;
}

function featureValues(features: { featureKey: string; enabled: boolean }[]): Record<string, boolean> {
  const on = new Set(features.filter((f) => f.enabled).map((f) => f.featureKey));
  const out: Record<string, boolean> = {};
  for (const k of FEATURE_KEYS) out[k] = on.has(k);
  return out;
}

const ALL_FEATURES_ON: Record<string, boolean> = Object.fromEntries(
  FEATURE_KEYS.map((k) => [k, true]),
);

function TrialInputs({ plan }: { plan?: {
  description?: string | null;
  hasTrial?: boolean;
  trialPriceCents?: number | null;
  trialDays?: number | null;
  trialRequiresPaymentMethod?: boolean;
} | null }) {
  return (
    <fieldset style={{ border: "1px solid var(--border)", borderRadius: 9, padding: "10px 14px 14px", marginTop: 14 }}>
      <legend className="small" style={{ fontWeight: 700 }}>Trial pricing</legend>
      <label className="check"><input type="checkbox" name="hasTrial" defaultChecked={plan?.hasTrial ?? false} /> Offer a trial</label>
      <div className="grid compact" style={{ marginTop: 8 }}>
        <div><label>Trial price cents</label><input name="trialPriceCents" defaultValue={plan?.trialPriceCents ?? 0} placeholder="0 = free trial" /></div>
        <div><label>Trial days</label><input name="trialDays" defaultValue={plan?.trialDays ?? ""} placeholder="e.g. 30 or 180" /></div>
      </div>
      <label className="check" style={{ marginTop: 8 }}>
        <input type="checkbox" name="trialRequiresPaymentMethod" defaultChecked={plan?.trialRequiresPaymentMethod ?? false} /> Require a payment method to start the trial
      </label>
      <p className="small" style={{ margin: "8px 0 0" }}>
        Billing reverts to the regular price above once the trial ends.
      </p>
    </fieldset>
  );
}

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: [{ status: "asc" }, { priceCents: "asc" }],
    include: { limits: true, features: true, _count: { select: { subscriptions: true } } },
  });

  return (
    <>
      <div className="actionbar">
        <div>
          <h1 className="h1">Plans &amp; Limits</h1>
          <p className="sub">
            Each plan picks which resources it includes and how much of each —
            DB-only, static-only or full-stack are all valid.
          </p>
        </div>
        <a className="btn" href="#new-plan">New plan</a>
      </div>

      <Table
        columns={["Plan", "Price", "Trial", "Status", "Core limits", "Resources", "Subs", "Actions"]}
        rows={plans.map((p) => {
          const enabled = new Set(p.features.filter((f) => f.enabled).map((f) => f.featureKey));
          return [
            <div key="plan">
              <strong>{p.name}</strong>
              <div className="small">{p.slug}</div>
            </div>,
            `${p.currency} ${(p.priceCents / 100).toFixed(2)} / ${p.billingInterval}`,
            p.hasTrial
              ? <span key="t" className="small">{p.trialPriceCents === 0 ? "free" : `$${((p.trialPriceCents ?? 0) / 100).toFixed(2)}`} · {p.trialDays}d</span>
              : <span key="t" className="muted">—</span>,
            <Badge key="status" status={p.status} />,
            <div key="limits" className="small">
              {p.limits?.maxProjects ?? "∞"} projects · {p.limits?.maxDatabases ?? "∞"} DBs<br />
              {bytes(p.limits?.maxDatabaseStorageBytes)} DB · {bytes(p.limits?.maxObjectStorageBytes)} object
            </div>,
            `${enabled.size}/${FEATURE_KEYS.length} enabled`,
            p._count.subscriptions,
            <a key="edit" className="btn secondary" href={`#edit-plan-${p.id}`}>Edit</a>,
          ];
        })}
      />

      <div id="new-plan" className="modal-backdrop">
        <div className="modal-card">
          <div className="modal-head"><strong>New plan</strong><a href="#" className="modal-close">x</a></div>
          <div className="modal-body">
            <form action={createPlan}>
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
              <div style={{ marginTop: 10 }}>
                <label>Description</label>
                <input name="description" placeholder="One-line plan summary shown to customers" />
              </div>
              <TrialInputs />
              <div className="section-title" style={{ marginTop: 14 }}>Resources &amp; limits</div>
              <PlanResourceEditor features={ALL_FEATURES_ON} limits={{}} />
              <div className="row" style={{ marginTop: 14 }}><button className="btn">Create plan</button><a href="#" className="btn secondary">Cancel</a></div>
            </form>
          </div>
        </div>
      </div>

      {plans.map((p) => (
        <div id={`edit-plan-${p.id}`} className="modal-backdrop" key={p.id}>
          <div className="modal-card">
            <div className="modal-head"><strong>Edit {p.name}</strong><a href="#" className="modal-close">x</a></div>
            <div className="modal-body">
              <form action={savePlan}>
                <input type="hidden" name="planId" value={p.id} />
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
                <div style={{ marginTop: 10 }}>
                  <label>Description</label>
                  <input name="description" defaultValue={p.description ?? ""} />
                </div>
                <TrialInputs plan={p} />
                <div className="section-title" style={{ marginTop: 14 }}>Resources &amp; limits</div>
                <PlanResourceEditor features={featureValues(p.features)} limits={limitValues(p.limits)} />
                <div className="row" style={{ marginTop: 14 }}><button className="btn">Save plan</button><a href="#" className="btn secondary">Cancel</a></div>
              </form>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
