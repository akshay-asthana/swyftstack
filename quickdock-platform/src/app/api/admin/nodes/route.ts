import { prisma, audit, NODE_ROLES } from "quickdock-shared";
import { z } from "zod";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(await prisma.node.findMany({ orderBy: { createdAt: "asc" } }));
}

const CreateNode = z.object({
  name: z.string().min(1),
  provider: z.string().min(1),
  publicIp: z.string().optional(),
  privateIp: z.string().optional(),
  region: z.string().optional(),
  roles: z.array(z.enum(NODE_ROLES)).default([]),
  cpuCores: z.number().positive(),
  ramBytes: z.number().positive(),
  diskBytes: z.number().positive(),
});

export async function POST(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const parsed = CreateNode.safeParse(await req.json());
  if (!parsed.success) return json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const node = await prisma.node.create({
    data: {
      name: d.name,
      provider: d.provider,
      publicIp: d.publicIp,
      privateIp: d.privateIp,
      region: d.region,
      roles: d.roles,
      cpuCores: d.cpuCores,
      ramBytes: BigInt(d.ramBytes),
      diskBytes: BigInt(d.diskBytes),
      status: "provisioning",
    },
  });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "node.created",
    targetType: "node",
    targetId: node.id,
  });
  return json(node, { status: 201 });
}
