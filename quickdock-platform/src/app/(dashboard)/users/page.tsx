import { revalidatePath } from "next/cache";
import { prisma, audit } from "quickdock-shared";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

async function toggleSuspend(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const u = await prisma.user.findUniqueOrThrow({ where: { id } });
  const next = u.status === "suspended" ? "active" : "suspended";
  await prisma.user.update({ where: { id }, data: { status: next } });
  await audit({ actorType: "admin", action: `user.${next}`, targetType: "user", targetId: id });
  revalidatePath("/users");
}

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orgMemberships: true, projectMemberships: true } } },
  });
  return (
    <>
      <h1 className="h1">Users</h1>
      <p className="sub">All platform users. Suspending blocks sign-in and project access.</p>
      <Table
        columns={["Email", "Name", "Admin", "Status", "Orgs", "Projects", "Action"]}
        rows={users.map((u) => [
          u.email,
          u.name ?? "—",
          u.isPlatformAdmin ? "yes" : "—",
          <Badge key="s" status={u.status} />,
          u._count.orgMemberships,
          u._count.projectMemberships,
          <form key="a" action={toggleSuspend}>
            <input type="hidden" name="id" value={u.id} />
            <button className="btn secondary">
              {u.status === "suspended" ? "Unsuspend" : "Suspend"}
            </button>
          </form>,
        ])}
      />
    </>
  );
}
