import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { prisma } from "quickdock-shared";
import { UserShell } from "@/components/user-shell";
import { Panel } from "@/components/ui";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const user = await requireUser();
  const org = await prisma.organization.findFirst({
    where: { ownerUserId: user.id }, orderBy: { createdAt: "asc" },
  });

  return (
    <UserShell user={user} workspace={org?.name}>
      <div className="page-head">
        <div>
          <h1 className="h1">Help &amp; Support</h1>
          <p className="sub" style={{ marginBottom: 0 }}>Everything you need to ship on Quickdock.</p>
        </div>
        <Link className="btn" href="/projects/new"><Icon name="plus" size={15} /> New project</Link>
      </div>

      <div className="split-even">
        <div className="guide">
          <h3 style={{ margin: "0 0 4px" }}><Icon name="rocket" size={16} /> &nbsp;Deploy your first app</h3>
          <ol className="small">
            <li>Open a <Link href="/projects">project</Link> (or create one).</li>
            <li>Click <strong>New app</strong> and pick a framework — Next.js, static, Node, Python or a
              serverless API.</li>
            <li>Optionally point it at a Git repository &amp; branch for build-from-source.</li>
            <li>Quickdock queues a deployment, builds it, and assigns it to an available app node.</li>
          </ol>
        </div>

        <div className="guide">
          <h3 style={{ margin: "0 0 4px" }}><Icon name="database" size={16} /> &nbsp;Create a database</h3>
          <ol className="small">
            <li>Inside a project, click <strong>New database</strong>.</li>
            <li>A managed PostgreSQL database is provisioned on the least-loaded cluster with an isolated
              role and an encrypted password.</li>
            <li>Watch the status move from <code>provisioning</code> to <code>active</code>.</li>
            <li>Storage limits follow your plan — track them on the <Link href="/usage">Usage</Link> page.</li>
          </ol>
        </div>
      </div>

      <Panel title="Monitoring your usage">
        <p className="small" style={{ margin: 0 }}>
          The <Link href="/usage">Usage &amp; Billing</Link> page shows live consumption — vCPU hours,
          database &amp; object storage, egress bandwidth and resource counts — measured against your
          plan limits. The <Link href="/">Dashboard</Link> surfaces the headline numbers and recent
          activity across every project.
        </p>
      </Panel>

      <Panel title="Plans &amp; limits">
        <p className="small" style={{ margin: 0 }}>
          Each plan defines how many projects, databases, team members and custom domains you get, plus
          monthly vCPU and storage allowances. Upgrade any time from the
          {" "}<Link href="/pricing?next=/help">pricing page</Link> — limits apply immediately.
        </p>
      </Panel>

      <Panel title="Contact support">
        <p className="small" style={{ margin: 0 }}>
          Need a hand? Email <code>support@quickdock.dev</code> with your workspace name
          {org ? <> (<strong>{org.name}</strong>)</> : null} and we&apos;ll get back to you.
        </p>
      </Panel>
    </UserShell>
  );
}
