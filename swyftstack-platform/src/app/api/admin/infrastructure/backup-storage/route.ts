import { prisma, backupProviderService, audit } from "swyftstack-shared";
import { z } from "zod";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(
    await prisma.backupStorageProvider.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { databaseBackups: true, controlPlaneBackups: true } } },
    }),
  );
}

const Body = z.object({
  name: z.string().min(1),
  provider: z.enum(["b2", "r2", "hetzner", "local_dev", "custom"]),
  localPath: z.string().optional(),
  endpoint: z.string().optional(),
  region: z.string().optional(),
  bucket: z.string().optional(),
  prefix: z.string().optional(),
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  isDefault: z.boolean().optional(),
  retentionPolicy: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const p = Body.safeParse(await req.json());
  if (!p.success) return json({ error: p.error.flatten() }, { status: 400 });
  if (p.data.isDefault) {
    await prisma.backupStorageProvider.updateMany({ data: { isDefault: false } });
  }
  const created = await backupProviderService.createProvider(p.data);
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "backup_storage_provider.created",
    targetType: "backup_storage_provider",
    targetId: created.id,
  });
  return json(created, { status: 201 });
}
