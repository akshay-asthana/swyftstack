import { retryJob, audit } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  await retryJob(params.id);
  await audit({ actorType: "admin", actorUserId: a.adminId, action: "job.retried", targetType: "job", targetId: params.id });
  return json({ ok: true });
}
