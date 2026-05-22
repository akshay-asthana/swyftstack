// Infrastructure — the single operational hub (§5/§6). Merges the former
// "Infrastructure" (fleet overview) and "Providers" pages and adds Nodes and
// Provisioning Defaults. Tabs are query-param driven so links are shareable.
import Link from "next/link";
import { OverviewSection } from "./overview-section";
import { NodesSection } from "./nodes-section";
import { ProvidersSection } from "./providers-section";
import { ProvisioningSection } from "./provisioning-section";
import { HelpSection } from "./help-section";

export const dynamic = "force-dynamic";

const TABS: [string, string][] = [
  ["overview", "Overview"],
  ["nodes", "Nodes"],
  ["database-clusters", "Database Clusters"],
  ["object-storage", "Object Storage"],
  ["backup-storage", "Backup Storage"],
  ["workers", "Worker Configs"],
  ["provisioning", "Provisioning Defaults"],
  ["help", "Help"],
];

const PROVIDER_TABS = new Set(["database-clusters", "object-storage", "backup-storage", "workers"]);

export default async function InfrastructurePage({
  searchParams,
}: {
  searchParams: { tab?: string; error?: string };
}) {
  const tab = TABS.some(([id]) => id === searchParams.tab) ? searchParams.tab! : "overview";

  return (
    <>
      <div className="actionbar">
        <div>
          <h1 className="h1">Infrastructure</h1>
          <p className="sub">
            Nodes, database clusters, storage, workers and provisioning
            defaults — one operational hub.
          </p>
        </div>
      </div>

      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        {TABS.map(([id, label]) => (
          <Link
            key={id}
            href={`/infrastructure?tab=${id}`}
            className={`btn ${tab === id ? "" : "secondary"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {tab === "overview" && <OverviewSection />}
      {tab === "nodes" && <NodesSection searchParams={searchParams} />}
      {PROVIDER_TABS.has(tab) && <ProvidersSection tab={tab} />}
      {tab === "provisioning" && <ProvisioningSection />}
      {tab === "help" && <HelpSection />}
    </>
  );
}
