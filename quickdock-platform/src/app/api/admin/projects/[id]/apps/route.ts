import { prisma, enqueueJob, audit } from "quickdock-shared";
import { z } from "zod";
import { authorize, json } from "@/lib/api";

const CreateApp = z.object({
  name: z.string().min(1),
  type: z.enum(["nextjs", "static", "node", "python", "serverless_api"]),
  repoUrl: z.string().optional(),
  branch: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = await authorize(req);
  if (!a.ok) return a.res;
  const p = CreateApp.safeParse(await req.json());
  if (!p.success) return json({ error: p.error.flatten() }, { status: 400 });

  const node = await prisma.node.findFirst({ where: { roles: { has: "app" }, status: "active" } });
  const app = await prisma.app.create({
    data: {
      projectId: params.id,
      nodeId: node?.id,
      name: p.data.name,
      type: p.data.type,
      status: "created",
      cpuLimit: 0.25,
      memoryLimitBytes: BigInt(256 * 1024 * 1024),
    },
  });
  const deployment = await prisma.deployment.create({
    data: {
      appId: app.id,
      sourceType: p.data.repoUrl ? "git" : "cli",
      repoUrl: p.data.repoUrl,
      branch: p.data.branch,
      status: "queued",
      buildNodeId: node?.id,
      runtimeNodeId: node?.id,
    },
  });
  const jobId = await enqueueJob("deploy_app", { deploymentId: deployment.id }, { priority: 40 });
  await audit({
    actorType: "admin",
    actorUserId: a.adminId,
    action: "deployment.requested",
    targetType: "app",
    targetId: app.id,
  });
  return json({ app, deployment, jobId }, { status: 201 });
}
