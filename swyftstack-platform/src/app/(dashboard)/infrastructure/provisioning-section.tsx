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
  const policies = await prisma.provisioningPolicy.findMany();
  const byType = new Map(policies.map((p) => [p.resourceType, p]));

  const kinds = [...new Set(Object.values(RESOURCE_TARGET_KIND))] as ProvisioningTargetType[];
  const optionsByKind = new Map<ProvisioningTargetType, { id: string; label: string }[]>();
  for (const k of kinds) optionsByKind.set(k, await targetOptions(k));

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

    const decision = await provisioningPolicyService.selectTarget(resourceType as ProvisioningResourceType);
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
        <form action={savePolicy} className="row" style={{ gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <input type="hidden" name="policyId" value={policy.id} />
          <div>
            <label className="small">Strategy</label>
            <select name="strategy" defaultValue={policy.strategy}>
              {PROVISIONING_STRATEGIES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <label className="check" style={{ alignSelf: "end" }}>
            <input type="checkbox" name="enabled" defaultChecked={policy.enabled} /> Policy enabled
          </label>
          <button className="btn secondary" style={{ alignSelf: "end" }}>Save policy</button>
        </form>

        {decision.candidates.length === 0 ? (
          <p className="small">No targets yet — add one below.</p>
        ) : (
          <div>
            <div className="row small" style={{ fontWeight: 700, padding: "0 4px 4px", gap: 8 }}>
              <span style={{ flex: 2 }}>Target</span>
              <span style={{ width: 56 }}>Prio</span>
              <span style={{ width: 64 }}>Weight</span>
              <span style={{ width: 64 }}>Max %</span>
              <span style={{ width: 56 }}>On</span>
              <span style={{ width: 72 }}>Health</span>
              <span style={{ flex: 1 }} />
            </div>
            {decision.candidates.map((t) => (
              <form
                key={t.id}
                action={saveTarget}
                className="row"
                style={{ gap: 8, alignItems: "center", padding: "8px 4px", borderTop: "1px solid var(--border)" }}
              >
                <input type="hidden" name="targetId" value={t.id} />
                <span style={{ flex: 2 }}>
                  <strong>{t.name}</strong>
                  {decision.chosen?.targetId === t.targetId && (
                    <span className="tag accent" style={{ marginLeft: 6 }}>would pick</span>
                  )}
                  <div className="small">
                    usage {t.usagePercent === null ? "not reported" : `${t.usagePercent.toFixed(0)}%`} · {t.note}
                  </div>
                </span>
                <input name="priority" defaultValue={t.priority} style={{ width: 56 }} />
                <input name="weight" defaultValue={t.weight} style={{ width: 64 }} />
                <input name="maxUsagePercent" defaultValue={t.maxUsagePercent ?? ""} placeholder="—" style={{ width: 64 }} />
                <span style={{ width: 56 }}>
                  <input type="checkbox" name="enabled" defaultChecked={t.enabled} style={{ width: "auto" }} />
                </span>
                <span style={{ width: 72 }}><Badge status={t.healthy ? "active" : "degraded"} /></span>
                <span className="row" style={{ flex: 1, gap: 6, justifyContent: "flex-end" }}>
                  <button className="btn sm secondary" type="submit">Save</button>
                  <button className="btn sm danger" type="submit" formAction={removeTarget}>Remove</button>
                </span>
              </form>
            ))}
          </div>
        )}

        <p className="small" style={{ margin: "10px 0 6px" }}>
          Decision preview: {decision.reason}
        </p>

        {available.length > 0 ? (
          <form action={addTarget} className="row" style={{ gap: 8 }}>
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
      <div className="split-even">{cards}</div>
    </>
  );
}
