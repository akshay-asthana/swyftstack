import Link from "next/link";
import { env } from "quickdock-shared";
import { Table } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const rows: [string, string][] = [
    ["NODE_ENV", env.NODE_ENV],
    ["LOG_LEVEL", env.LOG_LEVEL],
    ["Platform URL", env.PLATFORM_BASE_URL],
    ["User app URL", env.USERAPP_BASE_URL],
    ["Control DB", env.DATABASE_URL.replace(/:\/\/[^@]*@/, "://***@")],
    ["Secret encryption", env.SECRET_ENCRYPTION_KEY ? "configured" : "DEV FALLBACK (set SECRET_ENCRYPTION_KEY)"],
    ["Worker poll default", `${env.DEFAULT_WORKER_POLL_INTERVAL_MS} ms (fallback only)`],
    ["Worker concurrency default", `${env.DEFAULT_WORKER_CONCURRENCY} (fallback only)`],
  ];
  return (
    <>
      <h1 className="h1">Settings</h1>
      <p className="sub">
        Control-plane runtime config (from env). Customer infrastructure —
        Postgres clusters, object storage, backup targets, worker tuning — is
        DB-managed on the <Link href="/infrastructure">Infrastructure</Link> page,
        not here.
      </p>
      <Table columns={["Key", "Value"]} rows={rows.map(([k, v]) => [k, <code key="v">{v}</code>])} />
    </>
  );
}
