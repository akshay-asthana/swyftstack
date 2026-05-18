import { prisma, audit } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const body = await req.json().catch(() => ({}));
  const data: { status?: string; isDefault?: boolean } = {};
  if (body.status) {
    if (!["active", "disabled", "degraded"].includes(String(body.status))) {
      return json({ error: "invalid status" }, { status: 400 });
    }
    data.status = String(body.status);
  }
  if (typeof body.isDefault === "boolean") {
    if (body.isDefault) await prisma.backupStorageProvider.updateMany({ data: { isDefault: false } });
    data.isDefault = body.isDefault;
  }
  const p = await prisma.backupStorageProvider.update({ where: { id: params.id }, data });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "backup_storage_provider.updated",
    targetType: "backup_storage_provider",
    targetId: params.id,
    metadata: data,
  });
  return json(p);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const dependents =
    (await prisma.databaseBackup.count({ where: { backupStorageProviderId: params.id } })) +
    (await prisma.controlPlaneBackup.count({ where: { backupStorageProviderId: params.id } }));
  if (dependents > 0) {
    return json(
      { error: `cannot delete: ${dependents} backup(s) reference this provider` },
      { status: 409 },
    );
  }
  await prisma.backupStorageProvider.delete({ where: { id: params.id } });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "backup_storage_provider.deleted",
    targetType: "backup_storage_provider",
    targetId: params.id,
  });
  return json({ ok: true });
}
