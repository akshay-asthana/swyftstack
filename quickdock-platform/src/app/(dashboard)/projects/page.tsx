import { revalidatePath } from "next/cache";
import { prisma, enqueueJob, audit } from "quickdock-shared";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

async function suspend(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await enqueueJob("suspend_project", { projectId: id });
  await audit({ actorType: "admin", action: "project.suspend_requested", targetType: "project", targetId: id });
  revalidatePath("/projects");
}
async function unsuspend(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.project.update({ where: { id }, data: { status: "active" } });
  await audit({ actorType: "admin", action: "project.unsuspended", targetType: "project", targetId: id });
  revalidatePath("/projects");
}

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      organization: true,
      _count: { select: { apps: true, databases: true, buckets: true, members: true } },
    },
  });
  return (
    <>
      <h1 className="h1">Projects</h1>
      <p className="sub">Workload boundary: apps, databases, buckets, members, usage.</p>
      <Table
        columns={["Project", "Org", "Status", "Apps", "DBs", "Buckets", "Members", "Action"]}
        rows={projects.map((p) => [
          <strong key="n">{p.name}</strong>,
          p.organization.name,
          <Badge key="s" status={p.status} />,
          p._count.apps,
          p._count.databases,
          p._count.buckets,
          p._count.members,
          p.status === "active" ? (
            <form key="a" action={suspend}><input type="hidden" name="id" value={p.id} /><button className="btn danger">Suspend</button></form>
          ) : (
            <form key="a" action={unsuspend}><input type="hidden" name="id" value={p.id} /><button className="btn secondary">Unsuspend</button></form>
          ),
        ])}
      />
    </>
  );
}
