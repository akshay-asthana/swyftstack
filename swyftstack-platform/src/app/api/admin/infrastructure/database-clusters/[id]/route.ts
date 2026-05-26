import { prisma, audit } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

// Enable/disable a cluster.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status ?? "");
  if (!["active", "disabled", "degraded", "full"].includes(status)) {
    return json({ error: "invalid status" }, { status: 400 });
  }
  const c = await prisma.databaseCluster.update({ where: { id: params.id }, data: { status } });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: `database_cluster.${status}`,
    targetType: "database_cluster",
    targetId: params.id,
  });
  return json(c);
}

// Guarded delete: refuse while databases still depend on the cluster.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const dependents = await prisma.database.count({
    where: { databaseClusterId: params.id, status: { not: "deleted" } },
  });
  if (dependents > 0) {
    return json(
      { error: `cannot delete: ${dependents} database(s) still use this cluster` },
      { status: 409 },
    );
  }
  await prisma.databaseCluster.delete({ where: { id: params.id } });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "database_cluster.deleted",
    targetType: "database_cluster",
    targetId: params.id,
  });
  return json({ ok: true });
}
