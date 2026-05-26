import { revalidatePath } from "next/cache";
import {
  env,
  formatPublicId,
  hashToken,
  isProductionEnv,
  prisma,
  randomSecret,
  sendTransactionalEmail,
  uuidFromPublicId,
} from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Badge, Panel, Table, timeAgo } from "@/components/ui";

export const dynamic = "force-dynamic";

const ROLES = ["owner", "admin", "developer", "billing", "viewer"];

async function loadOrg(userId: string) {
  return prisma.organization.findFirst({
    where: { members: { some: { userId, role: { in: ["owner", "admin"] } } } },
    orderBy: { createdAt: "asc" },
    include: {
      members: { include: { user: true }, orderBy: { createdAt: "asc" } },
      projects: { orderBy: { createdAt: "desc" } },
      invitations: { where: { status: "pending" }, orderBy: { createdAt: "desc" } },
      subscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: { include: { limits: true, features: true } } },
      },
    },
  });
}

function inviteUrl(token: string): string {
  const url = new URL("/invite/accept", env.USERAPP_BASE_URL);
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendInviteEmail(email: string, token: string, organization: string) {
  const link = inviteUrl(token);
  await sendTransactionalEmail({
    to: email,
    subject: `Join ${organization} on Swyftstack`,
    text: `You have been invited to ${organization} on Swyftstack.\n\nAccept the invite here:\n${link}\n\nThis link expires in 7 days.`,
  });
  if (!isProductionEnv()) console.log(`[dev-invite-link] ${link}`);
  return link;
}

async function createInvite(formData: FormData) {
  "use server";
  const user = await requireUser();
  const org = await loadOrg(user.id);
  if (!org) return;
  const sub = org.subscriptions[0];
  const teamEnabled = sub?.plan.features.some((f) => f.featureKey === "team_members" && f.enabled) ?? false;
  const maxMembers = sub?.plan.limits?.maxTeamMembers ?? null;
  if (!teamEnabled || (maxMembers != null && org.members.length >= maxMembers)) return;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = ROLES.includes(String(formData.get("role"))) ? String(formData.get("role")) : "viewer";
  const projectValue = String(formData.get("projectId") ?? "");
  const projectId = projectValue ? uuidFromPublicId(projectValue, "project") : null;
  if (projectId && !org.projects.some((project) => project.id === projectId)) return;
  if (!email) return;
  const token = randomSecret(32);
  await prisma.invitation.create({
    data: {
      organizationId: org.id,
      projectId,
      email,
      role: role as never,
      tokenHash: hashToken(token),
      invitedBy: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
    },
  });
  await sendInviteEmail(email, token, org.name).catch((err) =>
    console.log(`[dev-invite] email delivery failed: ${String(err)} ${inviteUrl(token)}`),
  );
  revalidatePath("/team");
}

async function revokeInvite(formData: FormData) {
  "use server";
  const user = await requireUser();
  const org = await loadOrg(user.id);
  if (!org) return;
  await prisma.invitation.updateMany({
    where: { id: String(formData.get("inviteId") ?? ""), organizationId: org.id, status: "pending" },
    data: { status: "revoked" },
  });
  revalidatePath("/team");
}

async function resendInvite(formData: FormData) {
  "use server";
  const user = await requireUser();
  const org = await loadOrg(user.id);
  if (!org) return;
  const invite = await prisma.invitation.findFirst({
    where: { id: String(formData.get("inviteId") ?? ""), organizationId: org.id, status: "pending" },
  });
  if (!invite) return;
  const token = randomSecret(32);
  await prisma.invitation.update({
    where: { id: invite.id },
    data: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000) },
  });
  await sendInviteEmail(invite.email, token, org.name).catch((err) =>
    console.log(`[dev-invite] email delivery failed: ${String(err)} ${inviteUrl(token)}`),
  );
  revalidatePath("/team");
}

export default async function TeamPage() {
  const user = await requireUser();
  const org = await loadOrg(user.id);
  return (
    <UserShell user={user} organizationName={org?.name}>
      <div className="page-head">
        <div>
          <h1 className="h1">Team</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Invite collaborators and control their organization/project role.</p>
        </div>
      </div>
      {!org ? (
        <div className="note">You need owner or admin access to manage team invitations.</div>
      ) : (
        <>
          <Panel title="Invite teammate">
            <form action={createInvite}>
              <div className="form-grid">
                <div><label>Email</label><input name="email" type="email" required placeholder="teammate@example.com" /></div>
                <div><label>Role</label><select name="role" defaultValue="developer">{ROLES.filter((r) => r !== "owner").map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div><label>Project scope</label><select name="projectId" defaultValue=""><option value="">Organization-wide</option>{org.projects.map((p) => <option key={p.id} value={formatPublicId("project", p.id)}>{p.name}</option>)}</select></div>
              </div>
              <div style={{ marginTop: 14 }}><button className="btn">Send invite</button></div>
            </form>
          </Panel>
          <Panel title="Members" flush>
            <Table
              columns={["Name", "Email", "Role", "Joined"]}
              rows={org.members.map((m) => [m.user.name ?? "—", m.user.email, m.role, timeAgo(m.createdAt)])}
            />
          </Panel>
          <Panel title="Pending invitations" flush>
            <Table
              columns={["Email", "Role", "Scope", "Status", "Expires", "Actions"]}
              rows={org.invitations.map((i) => [
                i.email,
                i.role,
                i.projectId ? org.projects.find((p) => p.id === i.projectId)?.name ?? "Project" : "Organization",
                <Badge key="s" status={i.status} />,
                i.expiresAt.toLocaleDateString(),
                <div key="a" className="row row-tight">
                  <form action={resendInvite}><input type="hidden" name="inviteId" value={i.id} /><button className="btn sm secondary">Resend</button></form>
                  <form action={revokeInvite}><input type="hidden" name="inviteId" value={i.id} /><button className="btn sm danger">Revoke</button></form>
                </div>,
              ])}
            />
          </Panel>
        </>
      )}
    </UserShell>
  );
}
