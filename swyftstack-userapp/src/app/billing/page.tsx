import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Badge, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = await requireUser();
  const org = await prisma.organization.findFirst({
    where: { ownerUserId: user.id },
    include: {
      subscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  });
  const sub = org?.subscriptions[0];
  return (
    <UserShell user={user} workspace={org?.name}>
      <div className="page-head">
        <div>
          <h1 className="h1">Billing</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Plan summary and payment provider integration placeholder.</p>
        </div>
        <Link className="btn secondary" href="/pricing?next=/billing">Change plan</Link>
      </div>
      <Panel title="Current plan">
        <dl className="kv">
          <dt>Plan</dt><dd>{sub?.plan.name ?? "No active plan"}</dd>
          <dt>Status</dt><dd>{sub ? <Badge status={sub.status} /> : "—"}</dd>
          <dt>Billing phase</dt><dd>{sub?.billingPhase ?? "—"}</dd>
          <dt>Trial ends</dt><dd>{sub?.trialEndAt ? sub.trialEndAt.toLocaleDateString() : "—"}</dd>
          <dt>Price</dt><dd>{sub?.plan ? `$${(sub.plan.priceCents / 100).toFixed(2)} / ${sub.plan.billingInterval}` : "—"}</dd>
        </dl>
        <p className="small">Stripe/checkout integration is intentionally not wired in this MVP; plan assignment and limits are enforced from the control-plane database.</p>
      </Panel>
    </UserShell>
  );
}
