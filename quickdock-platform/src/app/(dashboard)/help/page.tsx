import Link from "next/link";
import { Icon } from "@/components/icons";
import { Panel } from "@/components/ui";

export const metadata = { title: "Help & Guides — Quickdock" };

function Code({ children }: { children: string }) {
  return <pre className="codeblock">{children}</pre>;
}

export default function HelpPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">Help &amp; Guides</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            Connect VPS nodes to Quickdock over SSH and start scheduling customer workloads.
          </p>
        </div>
        <Link className="btn" href="/nodes#new-node"><Icon name="plus" size={15} /> Connect a node</Link>
      </div>

      <Panel title="How node connectivity works">
        <p className="small" style={{ margin: "0 0 10px" }}>
          Quickdock connects to every VPS over standard SSH. You paste the node&apos;s <strong>private key</strong> once
          when registering it — Quickdock encrypts it at rest with AES-256-GCM and uses it for connectivity tests,
          metric probes, running-service snapshots and log tailing. No agent install is required for the MVP.
        </p>
        <dl className="kv">
          <dt>Connection mode</dt><dd><code>ssh</code> for a remote VPS, <code>local</code> for this control-plane host</dd>
          <dt>Auth</dt><dd>Encrypted private key (ed25519 recommended)</dd>
          <dt>Default user</dt><dd><code>root</code> (or any sudo-capable user)</dd>
          <dt>Default port</dt><dd><code>22</code></dd>
          <dt>Required roles</dt><dd>Pick at least one: <code>app</code>, <code>database</code>, <code>build</code>, <code>storage</code></dd>
        </dl>
      </Panel>

      <Panel title="Step 1 — Generate an SSH key for Quickdock">
        <p className="small" style={{ margin: "0 0 6px" }}>
          On your laptop or the control-plane host, create a dedicated key pair (do not reuse a personal key):
        </p>
        <Code>{`ssh-keygen -t ed25519 -C "quickdock-node" -f ~/.ssh/quickdock_node

# Public key  -> goes to the VPS provider
cat ~/.ssh/quickdock_node.pub

# Private key -> paste into Quickdock (Nodes -> New node)
cat ~/.ssh/quickdock_node`}</Code>
      </Panel>

      <div className="split-even">
        <div className="guide">
          <h3><Icon name="globe" size={16} /> &nbsp;Hetzner Cloud</h3>
          <p className="small">Add the key, create a server, then register it in Quickdock.</p>
          <ol className="small">
            <li>Hetzner Console → <strong>Security → SSH Keys → Add SSH Key</strong>. Paste the
              <code> quickdock_node.pub</code> contents.</li>
            <li><strong>Servers → Add Server</strong>. Choose a location (e.g. <code>fsn1</code>),
              Ubuntu 22.04, a CPX plan, and select the SSH key you just added.</li>
            <li>Copy the server&apos;s <strong>public IPv4</strong> once it boots.</li>
            <li>Verify connectivity from the control plane:</li>
          </ol>
          <Code>{`ssh -i ~/.ssh/quickdock_node root@<PUBLIC_IP>
# accept the host fingerprint, then exit`}</Code>
          <p className="small">In Quickdock: <strong>Nodes → New node</strong> → Provider <code>hetzner</code>,
            Region <code>fsn1</code>, SSH host = public IP, SSH user <code>root</code>, paste the private key.</p>
        </div>

        <div className="guide">
          <h3><Icon name="globe" size={16} /> &nbsp;OVHcloud</h3>
          <p className="small">OVH VPS images take a key at order time or via the panel.</p>
          <ol className="small">
            <li>OVH Manager → <strong>Public Cloud / VPS → order</strong>. During checkout under
              <strong> SSH key</strong>, upload <code>quickdock_node.pub</code>.</li>
            <li>If the VPS already exists, add the key manually:</li>
          </ol>
          <Code>{`ssh-copy-id -i ~/.ssh/quickdock_node.pub ubuntu@<VPS_IP>
# or append the .pub line to ~/.ssh/authorized_keys on the VPS`}</Code>
          <ol className="small" start={3}>
            <li>OVH VPS images often use the <code>ubuntu</code> user — enable root or use a sudo user.</li>
            <li>Verify, then register in Quickdock with Provider <code>ovh</code>, the OVH datacentre
              as Region (e.g. <code>gra</code>, <code>bhs</code>), and the matching SSH user.</li>
          </ol>
          <Code>{`ssh -i ~/.ssh/quickdock_node ubuntu@<VPS_IP> 'hostname && nproc'`}</Code>
        </div>
      </div>

      <div className="guide">
        <h3><Icon name="nodes" size={16} /> &nbsp;Any other VPS (DigitalOcean, Vultr, bare metal…)</h3>
        <ol className="small">
          <li>Append the public key to the server: <code>~/.ssh/authorized_keys</code> for the login user.</li>
          <li>Ensure the firewall allows inbound TCP on the SSH port (default <code>22</code>) from the
            control-plane IP.</li>
          <li>Confirm the box has Docker if you want real container workloads
            (<code>curl -fsSL https://get.docker.com | sh</code>) — without it, workloads run simulated.</li>
          <li>Register the node and click <strong>Test</strong> on the node page — Quickdock records the
            result in the connection log. Then click <strong>Probe</strong> to pull live CPU/RAM/disk metrics.</li>
        </ol>
      </div>

      <Panel title="Step 3 — Register &amp; verify in Quickdock">
        <ol className="small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Go to <Link href="/nodes#new-node">Nodes → New node</Link>.</li>
          <li>Set <strong>Connection mode</strong> to <em>Remote VPS over SSH</em>.</li>
          <li>Fill SSH host / user / port and paste the <strong>private key</strong>.</li>
          <li>Enter the node&apos;s real CPU / RAM / disk capacity and tick the roles it should serve.</li>
          <li>Save, then open the node and run <strong>Test</strong> → <strong>Probe</strong>. A green
            connection badge means the node is ready to accept workloads.</li>
        </ol>
        <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
          Troubleshooting: a failed test is logged with the exit code and stderr on the node&apos;s
          <em> Connection log</em> tab — common causes are a wrong user, a key not in
          <code> authorized_keys</code>, or a firewall blocking the SSH port.
        </p>
      </Panel>
    </>
  );
}
