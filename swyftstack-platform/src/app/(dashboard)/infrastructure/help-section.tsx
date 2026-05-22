// Infrastructure → Help. The admin mental model (§10) and the standard flows
// for onboarding compute nodes, storage providers and database clusters.
import Link from "next/link";
import { Panel } from "@/components/ui";

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="guide" style={{ margin: 0 }}>
      {items.map((s, i) => <li key={i}>{s}</li>)}
    </ol>
  );
}

export function HelpSection() {
  return (
    <>
      <div className="split-even">
        <Panel title="Add a compute node">
          <Steps
            items={[
              "Nodes tab → Add node. Enter connection details only.",
              "Open the node → Test connection & detect hardware.",
              "Review the auto-detected CPU / RAM / disk / OS / Docker.",
              "Confirm roles and activate the node.",
              "Provisioning Defaults → add it as an app / build / static target.",
            ]}
          />
        </Panel>
        <Panel title="Add a storage provider">
          <Steps
            items={[
              "Object Storage or Backup Storage tab → add provider.",
              "Enter endpoint / credentials (encrypted at rest on submit).",
              "Use the row action to test the connection.",
              "Pick its usage: object storage, backup storage, or both.",
              "Provisioning Defaults → add it as an object_storage / backup target.",
            ]}
          />
        </Panel>
        <Panel title="Add a database cluster">
          <Steps
            items={[
              "Database Clusters tab → add a cluster.",
              "Enter the admin connection string (encrypted at rest).",
              "Test the connection from the row action.",
              "It becomes available for provisioning when active.",
              "Provisioning Defaults → add it as a database target.",
            ]}
          />
        </Panel>
        <Panel title="How placement works">
          <p className="small" style={{ marginTop: 0 }}>
            Every new customer resource is placed through a{" "}
            <strong>provisioning policy</strong>. The policy picks a healthy
            target using its strategy (least-used, weighted, capacity, random or
            manual priority). Priority and weight tune the choice; a max-usage
            cap takes a target out of rotation before it is full.
          </p>
          <p className="small">
            Admin mental model: <em>Where can I run apps? Create databases?
            Store files? Store backups? What defaults apply to new users? What
            is healthy or overloaded?</em> — all answered on this page.
          </p>
        </Panel>
      </div>
      <Panel title="Provider setup guides">
        <p className="small" style={{ marginTop: 0 }}>
          Step-by-step credential guides for Backblaze B2, Cloudflare R2, Hetzner
          and OVHcloud live on the{" "}
          <Link href="/help">Help &amp; Guides</Link> page.
        </p>
      </Panel>
    </>
  );
}
