import Link from "next/link";
import { revalidatePath } from "next/cache";
import { env, platformSettingsService, PLATFORM_DOMAIN_KEYS } from "swyftstack-shared";
import { requireAdmin } from "@/lib/auth";
import { Panel, Table } from "@/components/ui";

export const dynamic = "force-dynamic";

async function saveDomains(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  for (const key of PLATFORM_DOMAIN_KEYS) {
    await platformSettingsService.setDomain(key, String(formData.get(key) ?? ""), admin.id);
  }
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const domains = await platformSettingsService.getDomains();
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
      <Panel title="Platform domains">
        <form action={saveDomains}>
          <div className="form-grid">
            <div>
              <label>Database gateway domain</label>
              <input name="database_gateway_domain" defaultValue={domains.database_gateway_domain} placeholder="db.swyftstack.com" />
              {!domains.database_gateway_domain && <p className="small">Not configured: customers see the selected database cluster host.</p>}
            </div>
            <div>
              <label>Storage gateway domain</label>
              <input name="storage_gateway_domain" defaultValue={domains.storage_gateway_domain} placeholder="storage.swyftstack.com" />
              {!domains.storage_gateway_domain && <p className="small">Not configured: console uploads use the user app API/local-dev provider.</p>}
            </div>
            <div>
              <label>App domain</label>
              <input name="app_domain" defaultValue={domains.app_domain} placeholder="apps.swyftstack.com" />
            </div>
            <div>
              <label>Console domain</label>
              <input name="console_domain" defaultValue={domains.console_domain} placeholder="swyftstack.com/console" />
            </div>
          </div>
          <div style={{ marginTop: 14 }}><button className="btn">Save domains</button></div>
        </form>
      </Panel>
    </>
  );
}
