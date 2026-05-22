import { enqueueJob, audit } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const jobId = await enqueueJob("suspend_project", { projectId: params.id });
  await audit({ actorType: "admin", actorUserId: a.adminId, action: "project.suspend_requested", targetType: "project", targetId: params.id });
  return json({ ok: true, jobId });
}
