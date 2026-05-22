import { prisma, audit, isLocalControlPlaneNode } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;

  const node = await prisma.node.findUnique({
    where: { id: params.id },
    include: { _count: { select: { apps: true, databases: true } } },
  });
  if (!node) return json({ error: "not found" }, { status: 404 });
  if (isLocalControlPlaneNode(node)) return json({ error: "local control-plane node cannot be deleted" }, { status: 409 });
  if (node.status !== "disabled") return json({ error: "only disabled nodes can be deleted" }, { status: 409 });
  if (node._count.apps > 0 || node._count.databases > 0) {
    return json({ error: "node still has workloads" }, { status: 409 });
  }

  await prisma.node.delete({ where: { id: params.id } });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "node.deleted",
    targetType: "node",
    targetId: params.id,
  });
  return json({ ok: true });
}
