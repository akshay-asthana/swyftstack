import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  env,
  platformSettingsService,
  PLATFORM_DOMAIN_KEYS,
  platformBucketService,
  prisma,
} from "swyftstack-shared";
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

async function savePlatformBucket(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const providerId = String(formData.get("platform_bucket_provider_id") ?? "").trim();
  if (!providerId) return;
  await platformBucketService.configure({
    providerId,
    bucketName: String(formData.get("platform_bucket_name") ?? "").trim() || undefined,
    prefix: String(formData.get("platform_bucket_prefix") ?? "").trim() || undefined,
    actorUserId: admin.id,
  });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const domains = await platformSettingsService.getDomains();
  const [bucketSettings, providers] = await Promise.all([
    platformBucketService.settings(),
    prisma.objectStorageProvider.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
  ]);
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

      <Panel title="Platform bucket (CMS + marketing assets)">
        <p className="small">
          Where Swyftstack stores its own assets — CMS images, marketing files, email
          attachments. Distinct from customer buckets so customers are never billed for
          platform-owned content. Asset paths are <code>/{bucketSettings.prefix}/marketing_data/&lt;yyyy&gt;/&lt;mm&gt;/&lt;uuid&gt;-&lt;file&gt;</code>.
        </p>
        <form action={savePlatformBucket}>
          <div className="form-grid">
            <div>
              <label>Storage provider</label>
              <select name="platform_bucket_provider_id" defaultValue={bucketSettings.providerId ?? ""}>
                <option value="">— select a provider —</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.provider}{p.region ? `, ${p.region}` : ""})
                  </option>
                ))}
              </select>
              {providers.length === 0 && (
                <p className="small">
                  Add an active provider on <Link href="/infrastructure?tab=object-storage">Infrastructure → Object Storage</Link> first.
                </p>
              )}
            </div>
            <div>
              <label>Bucket name</label>
              <input
                name="platform_bucket_name"
                defaultValue={bucketSettings.bucketName}
                placeholder="platform"
              />
            </div>
            <div>
              <label>Prefix</label>
              <input
                name="platform_bucket_prefix"
                defaultValue={bucketSettings.prefix}
                placeholder="platform"
              />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="btn" type="submit">Save platform bucket</button>
            {bucketSettings.bucketId && (
              <span className="small muted">bucket id: <code>{bucketSettings.bucketId.slice(0, 8)}…</code></span>
            )}
          </div>
        </form>
      </Panel>
    </>
  );
}
