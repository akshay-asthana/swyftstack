import { prisma, enqueueJob, audit } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

// Restore from the latest verified backup (or an explicit backupId in the body).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const body = await req.json().catch(() => ({}));
  let backupId: string | undefined = body.backupId;
  if (!backupId) {
    const latest = await prisma.databaseBackup.findFirst({
      where: { databaseId: params.id, status: "verified" },
      orderBy: { completedAt: "desc" },
    });
    if (!latest) return json({ error: "no verified backup to restore" }, { status: 409 });
    backupId = latest.id;
  }
  const jobId = await enqueueJob("restore_database", { backupId }, { priority: 30 });
  await audit({ actorType: "admin", actorUserId: a.adminId, action: "database.restore_requested", targetType: "database", targetId: params.id });
  return json({ ok: true, jobId, backupId });
}
