import { revalidatePath } from "next/cache";
import { prisma, localNodeService, env } from "quickdock-shared";
import { Table, Badge, bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

async function drain(formData: FormData) {
  "use server";
  await localNodeService.drain(String(formData.get("id")));
  revalidatePath("/nodes");
}
async function disable(formData: FormData) {
  "use server";
  await localNodeService.disable(String(formData.get("id")));
  revalidatePath("/nodes");
}

export default async function NodesPage() {
  const nodes = await prisma.node.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { apps: true, databases: true } } },
  });

  return (
    <>
      <h1 className="h1">Nodes</h1>
      <p className="sub">VPS worker nodes. Install command for a future node-agent is shown per node.</p>
      <Table
        columns={["Name", "Roles", "Status", "CPU", "RAM", "Workloads", "Heartbeat", "Actions"]}
        rows={nodes.map((n) => [
          <strong key="n">{n.name}</strong>,
          n.roles.join(", "),
          <Badge key="s" status={n.status} />,
          `${Number(n.cpuCores)} vCPU`,
          bytes(n.ramBytes),
          `${n._count.apps} apps / ${n._count.databases} dbs`,
          n.lastHeartbeatAt ? n.lastHeartbeatAt.toISOString().slice(11, 19) : "—",
          <div className="row" key="a">
            <form action={drain}><input type="hidden" name="id" value={n.id} /><button className="btn secondary">Drain</button></form>
            <form action={disable}><input type="hidden" name="id" value={n.id} /><button className="btn danger">Disable</button></form>
          </div>,
        ])}
      />
      <p className="small" style={{ marginTop: 16 }}>
        Future node-agent install (placeholder):<br />
        <code>curl -fsSL {env.PLATFORM_BASE_URL}/api/admin/nodes/agent-install.sh | NODE_TOKEN=&lt;token&gt; sh</code>
      </p>
    </>
  );
}
