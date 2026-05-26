import { enqueueJob, audit } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const jobId = await enqueueJob("backup_database", { databaseId: params.id }, { priority: 50 });
  await audit({ actorType: "admin", actorUserId: a.adminId, action: "backup.requested", targetType: "database", targetId: params.id });
  return json({ ok: true, jobId });
}
