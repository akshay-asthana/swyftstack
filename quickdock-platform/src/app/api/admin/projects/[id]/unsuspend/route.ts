import { prisma, audit } from "quickdock-shared";
import { authorize, json } from "@/lib/api";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  await prisma.project.update({ where: { id: params.id }, data: { status: "active" } });
  await audit({ actorType: "admin", actorUserId: a.adminId, action: "project.unsuspended", targetType: "project", targetId: params.id });
  return json({ ok: true });
}
