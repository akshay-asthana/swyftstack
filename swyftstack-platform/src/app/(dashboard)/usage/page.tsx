import { prisma } from "swyftstack-shared";
import { Table, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  const rollups = await prisma.usageRollup.findMany({
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { organization: true },
  });
  return (
    <>
      <h1 className="h1">Usage</h1>
      <p className="sub">Aggregated usage per organization for the current open period.</p>
      <Table
        columns={["Organization", "Usage type", "Quantity", "Updated"]}
        rows={rollups.map((r) => [
          r.organization.name,
          r.usageType,
          Number(r.quantity).toLocaleString(),
          r.updatedAt.toISOString().slice(0, 19).replace("T", " "),
        ])}
      />
      <p className="small" style={{ marginTop: 12 }}>
        Enforcement: warning ≥80%, builds blocked ≥100%, runtime suspended ≥110% (unless override).
        State machine: <Badge status="warning" /> <Badge status="limit_reached" /> <Badge status="over_limit" />
      </p>
    </>
  );
}
