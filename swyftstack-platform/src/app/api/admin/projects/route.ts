import { formatPublicId, prisma, withPublicId } from "swyftstack-shared";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { organization: { select: { id: true, name: true } } },
    });
  return json(projects.map((project) => ({
    ...withPublicId("project", project),
    organizationId: formatPublicId("organization", project.organizationId),
    organization: {
      ...project.organization,
      id: formatPublicId("organization", project.organization.id),
    },
  })));
}
