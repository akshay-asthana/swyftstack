import { enqueueJob, audit, formatPublicId, uuidFromPublicId } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  let projectId: string;
  try {
    projectId = uuidFromPublicId(params.id, "project");
  } catch {
    return json({ error: "invalid project id" }, { status: 400 });
  }
  const jobId = await enqueueJob("suspend_project", { projectId });
  await audit({ actorType: "admin", actorUserId: a.adminId, action: "project.suspend_requested", targetType: "project", targetId: projectId });
  return json({ ok: true, jobId, projectId: formatPublicId("project", projectId) });
}
