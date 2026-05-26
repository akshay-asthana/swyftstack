import { prisma, audit, formatPublicId, uuidFromPublicId } from "swyftstack-shared";
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
  await prisma.project.update({ where: { id: projectId }, data: { status: "active" } });
  await audit({ actorType: "admin", actorUserId: a.adminId, action: "project.unsuspended", targetType: "project", targetId: projectId });
  return json({ ok: true, projectId: formatPublicId("project", projectId) });
}
