import { revalidatePath } from "next/cache";
import { prisma, audit } from "quickdock-shared";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

async function savePlan(formData: FormData) {
  "use server";
  const planId = String(formData.get("planId"));
  const priceCents = Math.round(Number(formData.get("priceCents") ?? 0));
  await prisma.plan.update({ where: { id: planId }, data: { priceCents } });
  const num = (k: string) => {
    const v = formData.get(k);
    return v === "" || v === null ? null : BigInt(Math.round(Number(v)));
  };
  await prisma.planLimit.update({
    where: { planId },
    data: {
      maxProjects: Number(formData.get("maxProjects")) || null,
      maxDatabases: Number(formData.get("maxDatabases")) || null,
      maxDatabaseStorageBytes: num("maxDatabaseStorageBytes"),
      maxObjectStorageBytes: num("maxObjectStorageBytes"),
      maxEgressBytes: num("maxEgressBytes"),
      maxVcpuSeconds: num("maxVcpuSeconds"),
    },
  });
  await audit({ actorType: "admin", action: "plan.edited", targetType: "plan", targetId: planId });
  revalidatePath("/plans");
}

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: { priceCents: "asc" },
    include: { limits: true, features: true },
  });
  return (
    <>
      <h1 className="h1">Plans</h1>
      <p className="sub">Edit price, limits, and feature flags. Custom plans use the same schema.</p>
      {plans.map((p) => (
        <form key={p.id} action={savePlan} className="card" style={{ marginBottom: 16 }}>
          <input type="hidden" name="planId" value={p.id} />
          <div className="row">
            <strong style={{ fontSize: 16 }}>{p.name}</strong>
            <Badge status={p.status} />
            <span className="right small">{p.slug}</span>
          </div>
          <div className="grid" style={{ marginTop: 12 }}>
            <div><label>Price (cents)</label><input name="priceCents" defaultValue={p.priceCents} /></div>
            <div><label>Max projects</label><input name="maxProjects" defaultValue={p.limits?.maxProjects ?? ""} /></div>
            <div><label>Max databases</label><input name="maxDatabases" defaultValue={p.limits?.maxDatabases ?? ""} /></div>
            <div><label>DB storage (bytes)</label><input name="maxDatabaseStorageBytes" defaultValue={String(p.limits?.maxDatabaseStorageBytes ?? "")} /></div>
            <div><label>Object storage (bytes)</label><input name="maxObjectStorageBytes" defaultValue={String(p.limits?.maxObjectStorageBytes ?? "")} /></div>
            <div><label>Egress (bytes)</label><input name="maxEgressBytes" defaultValue={String(p.limits?.maxEgressBytes ?? "")} /></div>
            <div><label>vCPU-seconds</label><input name="maxVcpuSeconds" defaultValue={String(p.limits?.maxVcpuSeconds ?? "")} /></div>
          </div>
          <div className="small" style={{ marginTop: 10 }}>
            Features: {p.features.map((f) => `${f.featureKey}${f.enabled ? "" : " (off)"}`).join(", ") || "—"}
          </div>
          <div style={{ marginTop: 14 }}><button className="btn">Save plan</button></div>
        </form>
      ))}
    </>
  );
}
