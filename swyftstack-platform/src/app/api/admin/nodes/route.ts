import { prisma, audit, encryptSecret, NODE_ROLES, normalizeSshPrivateKey } from "swyftstack-shared";
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
  connectionMode: z.enum(["local", "ssh"]).default("ssh"),
  sshHost: z.string().optional(),
  sshPort: z.number().int().min(1).max(65535).default(22),
  sshUser: z.string().optional(),
  sshPrivateKey: z.string().optional(),
  region: z.string().optional(),
  roles: z.array(z.enum(NODE_ROLES)).min(1),
  cpuCores: z.number().positive(),
  ramBytes: z.number().positive(),
  diskBytes: z.number().positive(),
}).superRefine((data, ctx) => {
  if (data.connectionMode === "ssh") {
    if (!data.sshHost) ctx.addIssue({ code: "custom", path: ["sshHost"], message: "required for SSH nodes" });
    if (!data.sshUser) ctx.addIssue({ code: "custom", path: ["sshUser"], message: "required for SSH nodes" });
    if (!data.sshPrivateKey) ctx.addIssue({ code: "custom", path: ["sshPrivateKey"], message: "required for SSH nodes" });
    if (data.sshPrivateKey) {
      try {
        normalizeSshPrivateKey(data.sshPrivateKey);
      } catch (err) {
        ctx.addIssue({
          code: "custom",
          path: ["sshPrivateKey"],
          message: err instanceof Error ? err.message : "invalid SSH private key",
        });
      }
    }
  }
});

export async function POST(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const parsed = CreateNode.safeParse(await req.json());
  if (!parsed.success) return json({ error: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  const existing = await prisma.node.findUnique({ where: { name: d.name }, select: { id: true } });
  if (existing) return json({ error: "node name already exists" }, { status: 409 });
  // §1 — the platform allows only ONE local node.
  if (d.connectionMode === "local") {
    const existingLocal = await prisma.node.findFirst({
      where: { OR: [{ isLocal: true }, { nodeKey: "local-dev" }, { connectionMode: "local" }] },
      select: { id: true },
    });
    if (existingLocal) return json({ error: "a local node already exists" }, { status: 409 });
  }
  const node = await prisma.node.create({
    data: {
      name: d.name,
      provider: d.provider,
      publicIp: d.publicIp ?? (d.connectionMode === "ssh" ? d.sshHost : undefined),
      privateIp: d.privateIp,
      connectionMode: d.connectionMode,
      isLocal: d.connectionMode === "local",
      isProtected: d.connectionMode === "local",
      nodeKey: d.connectionMode === "local" ? "local-dev" : undefined,
      sshHost: d.connectionMode === "ssh" ? d.sshHost : undefined,
      sshPort: d.connectionMode === "ssh" ? d.sshPort : 22,
      sshUser: d.connectionMode === "ssh" ? d.sshUser : undefined,
      sshPrivateKeyEncrypted:
        d.connectionMode === "ssh" && d.sshPrivateKey
          ? encryptSecret(normalizeSshPrivateKey(d.sshPrivateKey))
          : undefined,
      lastConnectionStatus: "untested",
      region: d.region,
      roles: d.roles,
      cpuCores: d.cpuCores,
      ramBytes: BigInt(d.ramBytes),
      diskBytes: BigInt(d.diskBytes),
      status: "provisioning",
    },
  });
  if (d.connectionMode === "ssh") {
    await prisma.node.update({ where: { id: node.id }, data: { nodeKey: `node:${node.id}` } });
  }
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "node.created",
    targetType: "node",
    targetId: node.id,
  });
  return json(node, { status: 201 });
}
