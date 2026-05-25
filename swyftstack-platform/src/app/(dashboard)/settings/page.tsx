import Link from "next/link";
import { revalidatePath } from "next/cache";
import {
  env,
  platformSettingsService,
  PLATFORM_DOMAIN_KEYS,
  platformBucketService,
  prisma,
  upsertEmailProvider,
  activeEmailProvider,
  sendTransactionalEmail,
} from "swyftstack-shared";
import { requireAdmin } from "@/lib/auth";
import { Badge, Panel, Table, timeAgo } from "@/components/ui";

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

async function saveEmailProvider(formData: FormData) {
  "use server";
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const provider = String(formData.get("provider") ?? "zeptomail");
  const status = String(formData.get("status") ?? "active");
  await upsertEmailProvider({
    id,
    name: String(formData.get("name") ?? "").trim() || "ZeptoMail",
    provider: provider === "local_dev" || provider === "webhook" ? provider : "zeptomail",
    status: status === "disabled" ? "disabled" : "active",
    fromEmail: String(formData.get("fromEmail") ?? "").trim() || "no-reply@swyftstack.local",
    fromName: String(formData.get("fromName") ?? "").trim() || "Swyftstack",
    replyToEmail: String(formData.get("replyToEmail") ?? "").trim() || null,
    apiUrl: String(formData.get("apiUrl") ?? "").trim() || null,
    apiKey: String(formData.get("apiKey") ?? "").trim() || null,
  });
  revalidatePath("/settings");
}

async function testEmailProvider() {
  "use server";
  const admin = await requireAdmin();
  const result = await activeEmailProvider().then((p) => p.testConnection()).catch((err) => ({
    ok: false,
    message: String(err),
  }));
  await prisma.platformSetting.upsert({
    where: { key: "email_provider_test_result" },
    update: {
      value: `${result.ok ? "ok" : "failed"}: ${result.message}`,
      updatedBy: admin.id,
      description: "Last email provider connection test result.",
    },
    create: {
      key: "email_provider_test_result",
      value: `${result.ok ? "ok" : "failed"}: ${result.message}`,
      updatedBy: admin.id,
      description: "Last email provider connection test result.",
    },
  });
  revalidatePath("/settings");
}

async function sendTestEmail(formData: FormData) {
  "use server";
  const admin = await requireAdmin();
  const to = String(formData.get("to") ?? "").trim() || admin.email;
  await sendTransactionalEmail({
    to,
    subject: "Swyftstack test email",
    text: "This is a queued transactional email test from the Swyftstack control panel.",
    essential: true,
    metadata: { source: "admin_settings_test_email", adminId: admin.id },
  });
  revalidatePath("/settings");
}

export default async function SettingsPage() {
  const domains = await platformSettingsService.getDomains();
  const [bucketSettings, providers, emailProviders, emailTestResult, recentDeliveries] = await Promise.all([
    platformBucketService.settings(),
    prisma.objectStorageProvider.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.emailProvider.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.platformSetting.findUnique({ where: { key: "email_provider_test_result" } }),
    prisma.notificationDelivery.findMany({
      where: { channel: "email" },
      include: { notification: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
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

      <Panel title="Email providers">
        <p className="small">
          Transactional email is sent by workers from queued notification deliveries. ZeptoMail API tokens are encrypted at rest.
        </p>
        {emailTestResult && (
          <p className="note" style={{ marginTop: 10 }}>{emailTestResult.value}</p>
        )}
        <form action={saveEmailProvider} style={{ marginTop: 12 }}>
          <div className="form-grid">
            <div>
              <label>Name</label>
              <input name="name" placeholder="ZeptoMail production" />
            </div>
            <div>
              <label>Provider</label>
              <select name="provider" defaultValue="zeptomail">
                <option value="zeptomail">ZeptoMail</option>
                <option value="local_dev">Local dev logger</option>
                <option value="webhook">Webhook</option>
              </select>
            </div>
            <div>
              <label>Status</label>
              <select name="status" defaultValue="active">
                <option value="active">active</option>
                <option value="disabled">disabled</option>
              </select>
            </div>
            <div>
              <label>From email</label>
              <input name="fromEmail" placeholder="no-reply@swyftstack.com" />
            </div>
            <div>
              <label>From name</label>
              <input name="fromName" placeholder="Swyftstack" />
            </div>
            <div>
              <label>Reply-to email</label>
              <input name="replyToEmail" placeholder="support@swyftstack.com" />
            </div>
            <div>
              <label>API URL</label>
              <input name="apiUrl" placeholder="https://api.zeptomail.com/v1.1/email" />
            </div>
            <div>
              <label>API key</label>
              <input name="apiKey" type="password" placeholder="Paste to create or rotate" />
            </div>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" type="submit">Add provider</button>
            <button className="btn secondary" formAction={testEmailProvider}>Test active provider</button>
          </div>
        </form>
      </Panel>

      <Panel title={`Configured email providers (${emailProviders.length})`} flush>
        {emailProviders.length === 0 ? (
          <div className="empty-inline">No email providers configured. Use env fallback or add ZeptoMail above.</div>
        ) : (
          <Table
            columns={["Provider", "From", "Status", "API URL", "Edit"]}
            rows={emailProviders.map((p) => [
              <div key="p"><strong>{p.name}</strong><div className="small">{p.provider}</div></div>,
              `${p.fromName} <${p.fromEmail}>`,
              <Badge key="s" status={p.status} />,
              <code key="u">{p.apiUrl || "—"}</code>,
              <form key="f" action={saveEmailProvider}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="name" value={p.name} />
                <input type="hidden" name="provider" value={p.provider} />
                <input type="hidden" name="fromEmail" value={p.fromEmail} />
                <input type="hidden" name="fromName" value={p.fromName} />
                <input type="hidden" name="replyToEmail" value={p.replyToEmail ?? ""} />
                <div className="row row-tight">
                  <select name="status" defaultValue={p.status} style={{ width: 120 }}>
                    <option value="active">active</option>
                    <option value="disabled">disabled</option>
                  </select>
                  <input name="apiUrl" defaultValue={p.apiUrl} placeholder="API URL" style={{ width: 260 }} />
                  <input name="apiKey" type="password" placeholder="new key" style={{ width: 180 }} />
                  <button className="btn sm secondary" type="submit">Save</button>
                </div>
              </form>,
            ])}
          />
        )}
      </Panel>

      <Panel title="Send test email">
        <form action={sendTestEmail}>
          <div className="form-grid">
            <div>
              <label>Recipient</label>
              <input name="to" placeholder={env.PLATFORM_ADMIN_EMAIL} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}><button className="btn secondary" type="submit">Queue test email</button></div>
        </form>
      </Panel>

      <Panel title="Recent email deliveries" flush>
        <Table
          columns={["Created", "Recipient", "Type", "Status", "Provider", "Error"]}
          rows={recentDeliveries.map((d) => [
            timeAgo(d.createdAt),
            d.notification.user?.email ?? "metadata",
            d.notification.type,
            <Badge key="s" status={d.status} />,
            d.provider ?? "—",
            d.errorMessage ?? "—",
          ])}
        />
      </Panel>
    </>
  );
}
