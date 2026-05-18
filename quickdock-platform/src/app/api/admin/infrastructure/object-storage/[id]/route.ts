import { prisma, audit } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status ?? "");
  if (!["active", "disabled", "degraded"].includes(status)) {
    return json({ error: "invalid status" }, { status: 400 });
  }
  const p = await prisma.objectStorageProvider.update({
    where: { id: params.id },
    data: { status },
  });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: `object_storage_provider.${status}`,
    targetType: "object_storage_provider",
    targetId: params.id,
  });
  return json(p);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const dependents = await prisma.storageBucket.count({
    where: { objectStorageProviderId: params.id, status: { not: "deleted" } },
  });
  if (dependents > 0) {
    return json(
      { error: `cannot delete: ${dependents} bucket(s) still use this provider` },
      { status: 409 },
    );
  }
  await prisma.objectStorageProvider.delete({ where: { id: params.id } });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "object_storage_provider.deleted",
    targetType: "object_storage_provider",
    targetId: params.id,
  });
  return json({ ok: true });
}
