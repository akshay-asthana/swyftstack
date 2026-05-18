import { migrationService, prisma } from "quickdock-shared";
import { z } from "zod";
import { authorize, json } from "@/lib/api";

const Body = z.object({
  resourceType: z.enum(["app", "database", "static", "full_project"]),
  resourceId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
});

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(await prisma.migration.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
}

export async function POST(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const p = Body.safeParse(await req.json());
  if (!p.success) return json({ error: p.error.flatten() }, { status: 400 });
  const { resourceType, resourceId, targetNodeId } = p.data;
  let migrationId: string;
  if (resourceType === "app") migrationId = await migrationService.moveApp(resourceId, targetNodeId, a.adminId);
  else if (resourceType === "database") migrationId = await migrationService.moveDatabase(resourceId, targetNodeId, a.adminId);
  else if (resourceType === "static") migrationId = await migrationService.moveStaticSite(resourceId, targetNodeId, a.adminId);
  else migrationId = await migrationService.moveProject(resourceId, targetNodeId, a.adminId);
  return json({ ok: true, migrationId }, { status: 201 });
}
