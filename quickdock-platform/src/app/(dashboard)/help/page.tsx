import Link from "next/link";
import { prisma, type ProviderHelpBody } from "quickdock-shared";
import { Icon } from "@/components/icons";
import { Panel, KeyValue } from "@/components/ui";
import { Tabs } from "@/components/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Help & Guides — Quickdock" };

function Code({ children }: { children: string }) {
  return <pre className="codeblock">{children}</pre>;
}

function ProviderGuide({ doc }: { doc: { title: string; summary: string | null; providerKey: string; body: ProviderHelpBody } }) {
  const b = doc.body;
  return (
    <div className="guide">
      <h3><Icon name="storage" size={16} /> &nbsp;{doc.title}</h3>
      {doc.summary && <p className="small">{doc.summary}</p>}

      <div className="section-title">Credentials you need</div>
      <ol className="small">{b.credentials.map((c, i) => <li key={i}>{c}</li>)}</ol>

      <KeyValue
        rows={[
          ["Endpoint format", <code key="e">{b.endpointFormat}</code>],
          ["Region format", b.regionFormat],
          ["Bucket naming", b.bucketNaming],
          ["Path-style", b.pathStyle],
        ]}
      />

      <div className="section-title" style={{ marginTop: 12 }}>Test the connection</div>
      <Code>{b.testConnection}</Code>

      <div className="section-title">Use as an object storage provider</div>
      <p className="small">{b.asObjectStorage}</p>

      <div className="section-title">Use as a backup provider</div>
      <p className="small">{b.asBackupProvider}</p>

      <div className="section-title">Common errors</div>
      <ul className="small">
        {b.commonErrors.map((e, i) => (
          <li key={i}><strong>{e.error}</strong> — {e.fix}</li>
        ))}
      </ul>
    </div>
  );
}

export default async function HelpPage() {
  const docs = await prisma.providerHelpDoc.findMany({ orderBy: { sortOrder: "asc" } });

  const nodesTab = (
    <>
      <Panel title="How node connectivity works">
        <p className="small" style={{ margin: "0 0 10px" }}>
          Quickdock connects to every VPS over standard SSH. You paste the node&apos;s <strong>private key</strong> once
          when registering it — Quickdock encrypts it at rest with AES-256-GCM and uses it for the connection test,
          hardware discovery, metric probes and log tailing. CPU / RAM / disk are <strong>auto-detected</strong> —
          you never enter capacity by hand.
        </p>
        <KeyValue
          rows={[
            ["Connection mode", <span key="m"><code>ssh</code> for a remote VPS, <code>local</code> for this host</span>],
            ["Auth", "Encrypted private key (ed25519 recommended)"],
            ["Default user / port", <span key="u"><code>root</code> / <code>22</code></span>],
            ["Roles", <span key="r">Pick at least one: <code>app</code>, <code>database</code>, <code>build</code>, <code>proxy</code></span>],
          ]}
        />
      </Panel>

      <Panel title="Step 1 — Generate an SSH key for Quickdock">
        <Code>{`ssh-keygen -t ed25519 -C "quickdock-node" -f ~/.ssh/quickdock_node

# Public key  -> add to the VPS provider
cat ~/.ssh/quickdock_node.pub

# Private key -> paste into Quickdock (Nodes -> Add node)
cat ~/.ssh/quickdock_node`}</Code>
      </Panel>

      <Panel title="Step 2 — Register & auto-detect">
        <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Go to <Link href="/nodes#new-node">Nodes → Add node</Link> and enter connection details only.</li>
          <li>Open the node and click <strong>Test connection &amp; detect hardware</strong>.</li>
          <li>Review the detected CPU / RAM / disk / OS / Docker summary.</li>
          <li>Confirm roles and <strong>Activate</strong> — the node is now schedulable.</li>
        </ol>
        <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
          A failed discovery is logged with the exit code and stderr on the node&apos;s Logs tab — common causes
          are a wrong user, a key missing from <code>authorized_keys</code>, or a firewall blocking the SSH port.
        </p>
      </Panel>
    </>
  );

  const storageTab = (
    <>
      <Panel title="Adding a storage or backup provider">
        <p className="small" style={{ margin: 0 }}>
          Customer storage is <strong>configured from the control plane</strong>, never from environment variables.
          Register a provider under <Link href="/infrastructure">Providers</Link> — credentials are encrypted at
          rest with AES-256-GCM. Every provider below is S3-compatible and can serve as either a customer object
          storage provider or a backup target.
        </p>
      </Panel>
      {docs.length === 0 ? (
        <Panel title="No provider guides">
          <p className="small">Run <code>npm run db:seed</code> to load the provider help docs.</p>
        </Panel>
      ) : (
        <div className="split-even">
          {docs.map((d) => (
            <ProviderGuide
              key={d.id}
              doc={{ title: d.title, summary: d.summary, providerKey: d.providerKey, body: d.body as unknown as ProviderHelpBody }}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Help &amp; Guides</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            Connect VPS nodes and register storage / backup providers from the control plane.
          </p>
        </div>
        <Link className="btn" href="/nodes#new-node"><Icon name="plus" size={15} /> Add a node</Link>
      </div>

      <Tabs
        tabs={[
          { id: "nodes", label: "Connecting nodes", icon: "nodes", content: nodesTab },
          { id: "storage", label: "Storage providers", icon: "storage", content: storageTab },
        ]}
      />
    </>
  );
}
