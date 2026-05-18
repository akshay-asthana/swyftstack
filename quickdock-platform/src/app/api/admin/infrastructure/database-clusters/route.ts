import { prisma, databaseClusterService, audit } from "quickdock-shared";
import { z } from "zod";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(
    await prisma.databaseCluster.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { databases: true } } },
    }),
  );
}

const Body = z.object({
  name: z.string().min(1),
  adminConnectionString: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().optional(),
  defaultDatabase: z.string().optional(),
  sslRequired: z.boolean().optional(),
  region: z.string().optional(),
  maxDatabases: z.number().int().nullable().optional(),
  maxStorageBytes: z.number().int().nullable().optional(),
  engineVersion: z.string().optional(),
});

export async function POST(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const p = Body.safeParse(await req.json());
  if (!p.success) return json({ error: p.error.flatten() }, { status: 400 });
  const cluster = await databaseClusterService.createCluster(p.data);
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "database_cluster.created",
    targetType: "database_cluster",
    targetId: cluster.id,
  });
  return json(cluster, { status: 201 });
}
