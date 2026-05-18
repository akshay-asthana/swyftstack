import { prisma, encryptSecret, audit } from "quickdock-shared";
import { z } from "zod";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(
    await prisma.objectStorageProvider.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { buckets: true } } },
    }),
  );
}

const Body = z.object({
  name: z.string().min(1),
  provider: z.enum(["b2", "r2", "hetzner", "local_dev", "custom"]),
  endpoint: z.string().optional(),
  region: z.string().optional(),
  accessKey: z.string().optional(),
  secretKey: z.string().optional(),
  defaultBucket: z.string().optional(),
  pathStyle: z.boolean().optional(),
  publicBaseUrl: z.string().optional(),
  localPath: z.string().optional(),
  maxStorageBytes: z.number().int().nullable().optional(),
});

export async function POST(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const p = Body.safeParse(await req.json());
  if (!p.success) return json({ error: p.error.flatten() }, { status: 400 });
  const d = p.data;
  const created = await prisma.objectStorageProvider.create({
    data: {
      name: d.name,
      provider: d.provider,
      endpoint: d.endpoint,
      region: d.region,
      accessKeyEncrypted: d.accessKey ? encryptSecret(d.accessKey) : null,
      secretKeyEncrypted: d.secretKey ? encryptSecret(d.secretKey) : null,
      defaultBucket: d.defaultBucket,
      pathStyle: d.pathStyle ?? true,
      publicBaseUrl: d.publicBaseUrl,
      localPath: d.localPath,
      maxStorageBytes: d.maxStorageBytes != null ? BigInt(d.maxStorageBytes) : null,
      status: "active",
    },
  });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "object_storage_provider.created",
    targetType: "object_storage_provider",
    targetId: created.id,
  });
  return json(created, { status: 201 });
}
