import { redirect } from "next/navigation";
import { prisma } from "quickdock-shared";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function loadWorkspace(userId: string) {
  return prisma.organization.findFirst({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
    include: {
      subscriptions: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: { include: { limits: true } } },
      },
      _count: { select: { projects: true } },
    },
  });
}

async function createProject(formData: FormData) {
  "use server";
  const user = await requireUser();
  const workspace = await loadWorkspace(user.id);
  const subscription = workspace?.subscriptions[0];
  if (!workspace || !subscription) redirect("/pricing?next=/projects/new");

  const maxProjects = subscription.plan.limits?.maxProjects;
  if (maxProjects !== null && maxProjects !== undefined && workspace._count.projects >= maxProjects) {
    redirect("/pricing?next=/projects/new");
  }

  const name = String(formData.get("name") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim() || "local";
  if (!name) redirect("/projects/new");

  const baseSlug = slugify(name) || "project";
  let slug = baseSlug;
  let i = 2;
  while (await prisma.project.findUnique({ where: { organizationId_slug: { organizationId: workspace.id, slug } } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const project = await prisma.project.create({
    data: {
      organizationId: workspace.id,
      name,
      slug,
      region,
      createdBy: user.id,
      members: { create: { userId: user.id, role: "owner" } },
    },
  });
  redirect(`/projects/${project.id}`);
}

export default async function NewProjectPage() {
  const user = await requireUser();
  const workspace = await loadWorkspace(user.id);
  const subscription = workspace?.subscriptions[0];
  if (!workspace || !subscription) redirect("/pricing?next=/projects/new");

  return (
    <>
      <div className="topbar"><span className="brand">Quickdock</span></div>
      <div className="wrap">
        <h1 className="h1">Create project</h1>
        <p className="sub">Plan: {subscription.plan.name}</p>
        <form action={createProject} className="card" style={{ maxWidth: 520 }}>
          <label>Project name</label>
          <input name="name" required autoFocus placeholder="Production API" />
          <label>Region</label>
          <input name="region" defaultValue="local" />
          <div style={{ marginTop: 16 }}><button className="btn">Create project</button></div>
        </form>
      </div>
    </>
  );
}
