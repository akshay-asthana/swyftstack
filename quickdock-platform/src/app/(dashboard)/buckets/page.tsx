import { prisma } from "quickdock-shared";
import { Table, Badge, bytes } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BucketsPage() {
  const buckets = await prisma.storageBucket.findMany({
    orderBy: { createdAt: "desc" },
    include: { project: true },
  });
  return (
    <>
      <h1 className="h1">Storage Buckets</h1>
      <p className="sub">External object storage (local_dev in MVP; B2/R2/Hetzner later).</p>
      <Table
        columns={["Bucket", "Project", "Provider", "Status", "Storage", "Limit", "Egress"]}
        rows={buckets.map((b) => [
          <code key="n">{b.bucketName}{b.prefix ? `/${b.prefix}` : ""}</code>,
          b.project.name,
          b.provider,
          <Badge key="s" status={b.status} />,
          bytes(b.currentStorageBytes),
          bytes(b.storageLimitBytes),
          `${bytes(b.currentEgressBytes)} / ${bytes(b.egressLimitBytes)}`,
        ])}
      />
    </>
  );
}
