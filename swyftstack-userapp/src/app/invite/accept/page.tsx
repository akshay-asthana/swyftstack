import Link from "next/link";
import { redirect } from "next/navigation";
import { hashToken, prisma } from "swyftstack-shared";
import { currentUser } from "@/lib/auth";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function acceptInvite(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const user = await currentUser();
  if (!user) redirect(`/login?next=/invite/accept?token=${encodeURIComponent(token)}`);
  const invite = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!invite || invite.status !== "pending" || invite.expiresAt.getTime() < Date.now()) {
    redirect("/invite/accept?status=invalid");
  }
  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/invite/accept?status=email");
  }
  await prisma.$transaction(async (tx) => {
    if (invite.organizationId) {
      await tx.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
        update: { role: invite.role },
        create: { organizationId: invite.organizationId, userId: user.id, role: invite.role },
      });
    }
    if (invite.projectId) {
      await tx.projectMember.upsert({
        where: { projectId_userId: { projectId: invite.projectId, userId: user.id } },
        update: { role: invite.role, invitedBy: invite.invitedBy },
        create: { projectId: invite.projectId, userId: user.id, role: invite.role, invitedBy: invite.invitedBy },
      });
    }
    await tx.invitation.update({ where: { id: invite.id }, data: { status: "accepted" } });
  });
  redirect("/console");
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: { token?: string; status?: string };
}) {
  const user = await currentUser();
  const token = searchParams.token ?? "";
  const invite = token
    ? await prisma.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { organization: true, project: true } })
    : null;
  const invalid = searchParams.status === "invalid" || !token || !invite || invite.status !== "pending" || invite.expiresAt.getTime() < Date.now();
  return (
    <div className="login-wrap">
      <div className="login">
        <div className="brand-row">
          <div className="brand-mark"><Icon name="users" size={18} /></div>
          <div>
            <div className="brand-name">Accept invite</div>
            <div className="brand-sub">Join a Swyftstack organization</div>
          </div>
        </div>
        {invalid ? (
          <>
            <div className="err">This invitation is invalid, expired, or revoked.</div>
            <Link className="btn secondary" href="/console">Open console</Link>
          </>
        ) : (
          <>
            <p className="sub">
              You&apos;ve been invited to {invite.project?.name ?? invite.organization?.name ?? "an organization"} as <strong>{invite.role}</strong>.
            </p>
            {user && user.email.toLowerCase() !== invite.email.toLowerCase() && (
              <div className="err">This invite was sent to {invite.email}. Sign in with that email to accept.</div>
            )}
            {user ? (
              <form action={acceptInvite}>
                <input type="hidden" name="token" value={token} />
                <button className="btn">Accept invitation</button>
              </form>
            ) : (
              <Link className="btn" href={`/login?next=/invite/accept?token=${encodeURIComponent(token)}`}>Sign in to accept</Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
