import { revalidatePath } from "next/cache";
import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Panel, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

async function updateName(formData: FormData) {
  "use server";
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  await prisma.user.update({ where: { id: user.id }, data: { name: name || null } });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const user = await requireUser();
  const org = await prisma.organization.findFirst({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      subscriptions: { where: { status: { in: ["active", "trialing", "past_due"] } }, include: { plan: true }, take: 1 },
      _count: { select: { projects: true, members: true } },
    },
  });
  const plan = org?.subscriptions[0]?.plan;

  return (
    <UserShell user={user} workspace={org?.name}>
      <div className="page-head">
        <div>
          <h1 className="h1">Settings</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Manage your account and workspace.</p>
        </div>
      </div>

      <div className="split">
        <Panel title="Profile">
          <form action={updateName}>
            <label>Display name</label>
            <input name="name" defaultValue={user.name ?? ""} placeholder="Your name" />
            <label>Email</label>
            <input value={user.email} disabled />
            <div style={{ marginTop: 16 }}><button className="btn">Save changes</button></div>
          </form>
        </Panel>

        <div>
          <Panel title="Workspace">
            <dl className="kv" style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "8px 12px", fontSize: 13, margin: 0 }}>
              <dt className="muted">Name</dt><dd style={{ margin: 0 }}>{org?.name ?? "—"}</dd>
              <dt className="muted">Plan</dt><dd style={{ margin: 0 }}>{plan?.name ?? "No active plan"}</dd>
              <dt className="muted">Projects</dt><dd style={{ margin: 0 }}>{org?._count.projects ?? 0}</dd>
              <dt className="muted">Members</dt><dd style={{ margin: 0 }}>{org?._count.members ?? 0}</dd>
              <dt className="muted">Account</dt><dd style={{ margin: 0 }}><Badge status={user.status} /></dd>
            </dl>
            <div style={{ marginTop: 14 }}>
              <Link className="btn secondary sm" href="/pricing?next=/settings">Manage plan</Link>
            </div>
          </Panel>
          <Panel title="Need help?">
            <p className="small" style={{ margin: 0 }}>
              See the <Link href="/help">getting started guide</Link> for deploying apps, creating
              databases and connecting domains.
            </p>
          </Panel>
        </div>
      </div>
    </UserShell>
  );
}
