import { prisma, audit } from "swyftstack-shared";
import { z } from "zod";
import { authorize, json } from "@/lib/api";

export async function GET(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  return json(
    await prisma.plan.findMany({ include: { limits: true, features: true }, orderBy: { priceCents: "asc" } }),
  );
}

const CreatePlan = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  priceCents: z.number().int().nonnegative().default(0),
  limits: z.record(z.string(), z.number().nullable()).default({}),
  features: z.record(z.string(), z.boolean()).default({}),
});

export async function POST(req: Request) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const p = CreatePlan.safeParse(await req.json());
  if (!p.success) return json({ error: p.error.flatten() }, { status: 400 });
  const d = p.data;
  const plan = await prisma.plan.create({
    data: {
      name: d.name,
      slug: d.slug,
      priceCents: d.priceCents,
      limits: {
        create: {
          maxProjects: d.limits.max_projects ?? null,
          maxDatabases: d.limits.max_databases ?? null,
          maxDatabaseStorageBytes: d.limits.max_database_storage_bytes != null ? BigInt(d.limits.max_database_storage_bytes) : null,
          maxObjectStorageBytes: d.limits.max_object_storage_bytes != null ? BigInt(d.limits.max_object_storage_bytes) : null,
          maxEgressBytes: d.limits.max_egress_bytes != null ? BigInt(d.limits.max_egress_bytes) : null,
          maxVcpuSeconds: d.limits.max_vcpu_seconds != null ? BigInt(d.limits.max_vcpu_seconds) : null,
        },
      },
      features: {
        create: Object.entries(d.features).map(([featureKey, enabled]) => ({ featureKey, enabled })),
      },
    },
    include: { limits: true, features: true },
  });
  await audit({ actorType: "admin", actorUserId: a.adminId, action: "plan.created", targetType: "plan", targetId: plan.id });
  return json(plan, { status: 201 });
}
