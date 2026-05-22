// Infrastructure → Provisioning Defaults (§7). Admin decides where new customer
// resources (apps, builds, databases, static sites, object storage, backups)
// are provisioned: targets, priority, weight, strategy and a max-usage cap.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  prisma,
  audit,
  provisioningPolicyService,
  PROVISIONING_RESOURCE_TYPES,
  PROVISIONING_STRATEGIES,
  RESOURCE_TARGET_KIND,
  type ProvisioningResourceType,
  type ProvisioningTargetType,
} from "swyftstack-shared";
import { Badge, Panel } from "@/components/ui";

const RESOURCE_LABELS: Record<string, string> = {
  app: "Apps",
  build: "Builds",
  database: "Databases",
  static: "Static sites",
  object_storage: "Object storage",
  backup: "Backups",
};

// ---- server actions -------------------------------------------------------

async function createPolicy(fd: FormData) {
  "use server";
  const resourceType = String(fd.get("resourceType"));
  await prisma.provisioningPolicy.upsert({
    where: { resourceType },
    update: {},
    create: {
      resourceType,
      name: `${RESOURCE_LABELS[resourceType] ?? resourceType} placement`,
      strategy: "least_used",
      enabled: true,
    },
  });
  revalidatePath("/infrastructure");
}

async function savePolicy(fd: FormData) {
  "use server";
  const id = String(fd.get("policyId"));
  await prisma.provisioningPolicy.update({
    where: { id },
    data: { strategy: String(fd.get("strategy")), enabled: fd.get("enabled") === "on" },
  });
  await audit({ actorType: "admin", action: "provisioning_policy.updated", targetType: "provisioning_policy", targetId: id });
  revalidatePath("/infrastructure");
}

async function addTarget(fd: FormData) {
  "use server";
  const policyId = String(fd.get("policyId"));
  const targetType = String(fd.get("targetType"));
  const targetId = String(fd.get("targetId"));
  if (!targetId) redirect("/infrastructure?tab=provisioning");
  const count = await prisma.provisioningTarget.count({ where: { policyId } });
  await prisma.provisioningTarget.upsert({
    where: { policyId_targetType_targetId: { policyId, targetType, targetId } },
    update: { enabled: true },
    create: { policyId, targetType, targetId, priority: count + 1, weight: 100, enabled: true },
  });
  revalidatePath("/infrastructure");
}

async function saveTarget(fd: FormData) {
  "use server";
  const id = String(fd.get("targetId"));
  const maxUsage = String(fd.get("maxUsagePercent") ?? "").trim();
  await prisma.provisioningTarget.update({
    where: { id },
    data: {
      priority: Math.max(1, Number(fd.get("priority") || 1)),
      weight: Math.max(0, Number(fd.get("weight") || 0)),
      enabled: fd.get("enabled") === "on",
      maxUsagePercent: maxUsage ? Math.min(100, Math.max(1, Number(maxUsage))) : null,
    },
  });
  revalidatePath("/infrastructure");
}

async function removeTarget(fd: FormData) {
  "use server";
  await prisma.provisioningTarget.delete({ where: { id: String(fd.get("targetId")) } });
  revalidatePath("/infrastructure");
}

// ---- candidate target lists ----------------------------------------------

async function targetOptions(kind: ProvisioningTargetType): Promise<{ id: string; label: string }[]> {
  if (kind === "node") {
    const nodes = await prisma.node.findMany({
      where: { status: { not: "archived" } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, status: true },
    });
    return nodes.map((n) => ({ id: n.id, label: `${n.name} (${n.status})` }));
  }
  if (kind === "database_cluster") {
    const c = await prisma.databaseCluster.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, status: true } });
    return c.map((x) => ({ id: x.id, label: `${x.name} (${x.status})` }));
  }
  if (kind === "object_storage_provider") {
    const p = await prisma.objectStorageProvider.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, status: true } });
    return p.map((x) => ({ id: x.id, label: `${x.name} (${x.status})` }));
  }
  const p = await prisma.backupStorageProvider.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, status: true } });
  return p.map((x) => ({ id: x.id, label: `${x.name} (${x.status})` }));
}

// ---- section --------------------------------------------------------------

export async function ProvisioningSection() {
  const kinds = [...new Set(Object.values(RESOURCE_TARGET_KIND))] as ProvisioningTargetType[];
  const [policies, optionEntries, decisions] = await Promise.all([
    prisma.provisioningPolicy.findMany(),
    Promise.all(kinds.map(async (k) => [k, await targetOptions(k)] as const)),
    Promise.all(
      PROVISIONING_RESOURCE_TYPES.map(async (resourceType) => [
        resourceType,
        await provisioningPolicyService.selectTarget(resourceType as ProvisioningResourceType),
      ] as const),
    ),
  ]);
  const byType = new Map(policies.map((p) => [p.resourceType, p]));
  const optionsByKind = new Map<ProvisioningTargetType, { id: string; label: string }[]>(optionEntries);
  const decisionByType = new Map(decisions);

  const cards: React.ReactNode[] = [];
  for (const resourceType of PROVISIONING_RESOURCE_TYPES) {
    const policy = byType.get(resourceType);
    const kind = RESOURCE_TARGET_KIND[resourceType];

    if (!policy) {
      cards.push(
        <Panel key={resourceType} title={RESOURCE_LABELS[resourceType]}>
          <p className="small">No provisioning policy yet.</p>
          <form action={createPolicy}>
            <input type="hidden" name="resourceType" value={resourceType} />
            <button className="btn">Create policy</button>
          </form>
        </Panel>,
      );
      continue;
    }

    const decision = decisionByType.get(resourceType)!;
    const used = new Set(decision.candidates.map((c) => c.targetId));
    const available = (optionsByKind.get(kind) ?? []).filter((o) => !used.has(o.id));

    cards.push(
      <Panel
        key={resourceType}
        title={
          <span>
            {RESOURCE_LABELS[resourceType]}{" "}
            <span className="small" style={{ fontWeight: 400 }}>→ {kind.replace(/_/g, " ")}</span>
          </span>
        }
        action={<Badge status={decision.chosen ? "active" : decision.policyEnabled ? "warning" : "disabled"} />}
      >
        <form action={savePolicy} className="provisioning-policy-bar">
          <input type="hidden" name="policyId" value={policy.id} />
          <div>
            <label className="small">Strategy</label>
            <select name="strategy" defaultValue={policy.strategy}>
              {PROVISIONING_STRATEGIES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <label className="check" style={{ margin: 0 }}>
            <input type="checkbox" name="enabled" defaultChecked={policy.enabled} /> Policy enabled
          </label>
          <span />
          <button className="btn secondary">Save policy</button>
        </form>

        <div className="provisioning-decision">
          <span className="small">Decision preview: {decision.reason}</span>
          {decision.chosen && <span className="tag accent">would pick {decision.chosen.name}</span>}
        </div>

        {decision.candidates.length === 0 ? (
          <p className="small">No targets yet — add one below.</p>
        ) : (
          <div className="prov-targets">
            <div className="prov-target-head">
              <span>Target</span>
              <span>Priority</span>
              <span>Weight</span>
              <span>Max usage</span>
              <span>On</span>
              <span>Health</span>
              <span />
            </div>
            {decision.candidates.map((t) => (
              <form
                key={t.id}
                action={saveTarget}
                className="prov-target-row"
              >
                <input type="hidden" name="targetId" value={t.id} />
                <span className="prov-target-name">
                  <strong>{t.name}</strong>
                  {decision.chosen?.targetId === t.targetId && (
                    <span className="tag accent" style={{ marginLeft: 6 }}>would pick</span>
                  )}
                  <div className="small">
                    usage {t.usagePercent === null ? "not reported" : `${t.usagePercent.toFixed(0)}%`} · {t.note}
                  </div>
                </span>
                <input name="priority" type="number" min={1} defaultValue={t.priority} aria-label={`${t.name} priority`} />
                <input name="weight" type="number" min={0} defaultValue={t.weight} aria-label={`${t.name} weight`} />
                <input name="maxUsagePercent" type="number" min={1} max={100} defaultValue={t.maxUsagePercent ?? ""} placeholder="—" aria-label={`${t.name} max usage percent`} />
                <label className="check prov-target-enabled" title="Target enabled">
                  <input type="checkbox" name="enabled" defaultChecked={t.enabled} />
                </label>
                <span><Badge status={t.healthy ? "active" : "degraded"} /></span>
                <span className="prov-target-actions">
                  <button className="btn sm secondary" type="submit">Save</button>
                  <button className="btn sm danger" type="submit" formAction={removeTarget}>Remove</button>
                </span>
              </form>
            ))}
          </div>
        )}

        {available.length > 0 ? (
          <form action={addTarget} className="provisioning-add">
            <input type="hidden" name="policyId" value={policy.id} />
            <input type="hidden" name="targetType" value={kind} />
            <select name="targetId" defaultValue="">
              <option value="" disabled>Add a target…</option>
              {available.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            <button className="btn secondary">Add target</button>
          </form>
        ) : (
          <p className="small">All available {kind.replace(/_/g, " ")}s are already targets.</p>
        )}
      </Panel>,
    );
  }

  return (
    <>
      <p className="small" style={{ marginBottom: 14 }}>
        New customer resources are placed on these targets. Each policy picks a
        healthy target with its strategy; priority and weight tune the choice.
        The <strong>would pick</strong> tag previews the live decision.
      </p>
      <div className="provisioning-stack">{cards}</div>
    </>
  );
}
