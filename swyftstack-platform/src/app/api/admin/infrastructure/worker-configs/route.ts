import { prisma, workerConfigService, audit } from "swyftstack-shared";
import { z } from "zod";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(await prisma.workerConfig.findMany({ orderBy: { workerType: "asc" } }));
}

const Body = z.object({
  name: z.string().min(1),
  workerType: z.enum(["default", "deploy", "backup", "metrics", "migration", "usage"]),
  enabled: z.boolean().default(true),
  pollIntervalMs: z.number().int().positive(),
  concurrency: z.number().int().positive(),
  lockTimeoutMs: z.number().int().positive(),
  queues: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const p = Body.safeParse(await req.json());
  if (!p.success) return json({ error: p.error.flatten() }, { status: 400 });
  const cfg = await prisma.workerConfig.upsert({
    where: { workerType: p.data.workerType },
    update: p.data,
    create: p.data,
  });
  workerConfigService.invalidate();
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "worker_config.saved",
    targetType: "worker_config",
    targetId: cfg.id,
  });
  return json(cfg, { status: 201 });
}
