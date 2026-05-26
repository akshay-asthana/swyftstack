import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  prisma,
  can,
  deleteStorageObject,
  listStorageObjects,
  rotateStorageCredentials,
  setStorageObjectPublic,
  signStorageUrl,
  storageCredential,
  storageEndpoint,
  uploadStorageObject,
  env,
  formatPublicId,
  uuidFromPublicId,
  type Role,
} from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Badge, Panel, StatCard, Table, bytes, timeAgo } from "@/components/ui";
import { CopyButton, SecretField } from "@/components/client";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function requireMembership(projectId: string) {
  const user = await requireUser();
  const resolvedProjectId = uuidFromPublicId(projectId, "project");
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: resolvedProjectId, userId: user.id } },
  });
  if (!membership) notFound();
  return { user, role: membership.role as Role, projectId: resolvedProjectId };
}

const projectHref = (projectId: string) => `/projects/${formatPublicId("project", projectId)}`;
const bucketHref = (projectId: string, bucketId: string) =>
  `${projectHref(projectId)}/storage/${formatPublicId("bucket", bucketId)}`;

async function uploadObject(formData: FormData) {
  "use server";
  const projectRef = String(formData.get("projectId") ?? "");
  const bucketId = uuidFromPublicId(String(formData.get("bucketId") ?? ""), "bucket");
  const { user, role, projectId } = await requireMembership(projectRef);
  if (!can(role, "storage.manage")) redirect(bucketHref(projectId, bucketId));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(bucketHref(projectId, bucketId));
  const key = String(formData.get("key") ?? "").trim() || file.name;
  await uploadStorageObject({
    bucketId,
    key,
    data: Buffer.from(await file.arrayBuffer()),
    contentType: file.type || "application/octet-stream",
    actorUserId: user.id,
  });
  revalidatePath(bucketHref(projectId, bucketId));
}

async function deleteObject(formData: FormData) {
  "use server";
  const projectRef = String(formData.get("projectId") ?? "");
  const bucketId = uuidFromPublicId(String(formData.get("bucketId") ?? ""), "bucket");
  const key = String(formData.get("key") ?? "");
  const { user, role, projectId } = await requireMembership(projectRef);
  if (!can(role, "storage.manage")) redirect(bucketHref(projectId, bucketId));
  await deleteStorageObject(bucketId, key, user.id);
  revalidatePath(bucketHref(projectId, bucketId));
}

async function togglePublic(formData: FormData) {
  "use server";
  const projectRef = String(formData.get("projectId") ?? "");
  const bucketId = uuidFromPublicId(String(formData.get("bucketId") ?? ""), "bucket");
  const key = String(formData.get("key") ?? "");
  const { role, projectId } = await requireMembership(projectRef);
  if (!can(role, "storage.manage")) redirect(bucketHref(projectId, bucketId));
  await setStorageObjectPublic(bucketId, key, formData.get("public") === "on");
  revalidatePath(bucketHref(projectId, bucketId));
}

async function rotateKeys(formData: FormData) {
  "use server";
  const projectRef = String(formData.get("projectId") ?? "");
  const bucketId = uuidFromPublicId(String(formData.get("bucketId") ?? ""), "bucket");
  const { role, projectId } = await requireMembership(projectRef);
  if (!can(role, "storage.manage")) redirect(bucketHref(projectId, bucketId));
  await rotateStorageCredentials(bucketId);
  revalidatePath(bucketHref(projectId, bucketId));
}

export default async function BucketDetailPage({
  params,
}: {
  params: { id: string; bucketId: string };
}) {
  const { user, role, projectId } = await requireMembership(params.id);
  const bucketId = uuidFromPublicId(params.bucketId, "bucket");
  const bucket = await prisma.storageBucket.findUnique({
    where: { id: bucketId },
    include: { project: { include: { organization: true } } },
  });
  if (!bucket || bucket.projectId !== projectId) notFound();
  const projectPublicId = formatPublicId("project", bucket.projectId);
  const bucketPublicId = formatPublicId("bucket", bucket.id);

  const [objects, credential, endpoint] = await Promise.all([
    listStorageObjects(bucket.id),
    storageCredential(bucket.id),
    storageEndpoint(bucket.id),
  ]);
  const canManage = can(role, "storage.manage");

  return (
    <UserShell user={user} organizationName={bucket.project.organization.name}>
      <div className="page-head">
        <div>
          <div className="row" style={{ gap: 10 }}>
            <h1 className="h1" style={{ margin: 0 }}>{bucket.bucketName}</h1>
            <Badge status={bucket.status} />
          </div>
          <p className="sub" style={{ margin: "4px 0 0" }}>
            <Link href="/projects">Projects</Link> · <Link href={projectHref(bucket.projectId)}>{bucket.project.name}</Link> · object storage
          </p>
        </div>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <StatCard icon="storage" tone="amber" label="Stored" value={bytes(bucket.currentStorageBytes)} />
        <StatCard icon="apps" tone="blue" label="Objects" value={bucket.objectCount.toString()} />
        <StatCard icon="arrowUp" tone="green" label="Egress" value={bytes(bucket.currentEgressBytes)} />
        <StatCard icon="shield" tone="violet" label="Visibility" value={bucket.isPublic ? "public" : "private"} />
      </div>

      <Panel title="Endpoint and keys">
        {endpoint.warning && <div className="note" style={{ marginBottom: 10 }}>{endpoint.warning}</div>}
        <dl className="kv">
          <dt>Endpoint</dt><dd><code>{endpoint.endpoint}</code> <CopyButton value={endpoint.endpoint} /></dd>
          <dt>Bucket</dt><dd>{bucket.bucketName}</dd>
          <dt>Access key</dt><dd>{credential ? <SecretField value={credential.accessKey} /> : "provisioning"}</dd>
          <dt>Secret key</dt><dd>{credential ? <SecretField value={credential.secretKey} /> : "provisioning"}</dd>
        </dl>
        {canManage && (
          <form action={rotateKeys} style={{ marginTop: 12 }}>
            <input type="hidden" name="projectId" value={projectPublicId} />
            <input type="hidden" name="bucketId" value={bucketPublicId} />
            <button className="btn secondary" type="submit"><Icon name="key" size={14} /> Rotate keys</button>
          </form>
        )}
      </Panel>

      {canManage && (
        <Panel title="Upload file">
          <form action={uploadObject}>
            <input type="hidden" name="projectId" value={projectPublicId} />
            <input type="hidden" name="bucketId" value={bucketPublicId} />
            <label>Object key</label>
            <input name="key" placeholder="uploads/avatar.png" />
            <label>File</label>
            <input name="file" type="file" required />
            <div style={{ marginTop: 14 }}><button className="btn" type="submit">Upload</button></div>
          </form>
        </Panel>
      )}

      <Panel title="Files" flush>
        <Table
          columns={["Key", "Size", "Type", "Updated", "Visibility", "Actions"]}
          empty="No files in this bucket."
          rows={objects.map((o) => {
            const downloadUrl = `/api/storage/object?bucketId=${bucketPublicId}&key=${encodeURIComponent(o.key)}`;
            const publicUrl = `/api/storage/public?bucketId=${bucketPublicId}&key=${encodeURIComponent(o.key)}`;
            const signedUrl = signStorageUrl({ bucketId: bucket.id, key: o.key, action: "download" });
            return [
              <code key="k">{o.key}</code>,
              bytes(o.sizeBytes),
              o.contentType ?? "—",
              timeAgo(o.updatedAt),
              bucket.isPublic && o.isPublic ? "public" : "private",
              <div key="a" className="row row-tight">
                <a className="btn sm secondary" href={downloadUrl}>Download</a>
                <CopyButton value={signedUrl} label="Signed URL" />
                {bucket.isPublic && o.isPublic && <CopyButton value={new URL(publicUrl, env.USERAPP_BASE_URL).toString()} label="Public URL" />}
                {canManage && (
                  <>
                    <form action={togglePublic}>
                      <input type="hidden" name="projectId" value={projectPublicId} />
                      <input type="hidden" name="bucketId" value={bucketPublicId} />
                      <input type="hidden" name="key" value={o.key} />
                      <input type="hidden" name="public" value={o.isPublic ? "off" : "on"} />
                      <button className="btn sm secondary" type="submit">{o.isPublic ? "Make private" : "Make public"}</button>
                    </form>
                    <form action={deleteObject}>
                      <input type="hidden" name="projectId" value={projectPublicId} />
                      <input type="hidden" name="bucketId" value={bucketPublicId} />
                      <input type="hidden" name="key" value={o.key} />
                      <button className="btn sm danger" type="submit">Delete</button>
                    </form>
                  </>
                )}
              </div>,
            ];
          })}
        />
      </Panel>

      <Panel title="Quickstart">
        <div className="snippet-grid">
          {[
            ["Browser upload", `const form = new FormData();\nform.append("file", file);\nform.append("key", file.name);\nawait fetch("${endpoint.endpoint}/object?bucketId=${bucketPublicId}", { method: "POST", body: form });`],
            ["Signed upload", `await fetch("${signStorageUrl({ bucketId: bucket.id, key: "uploads/file.txt", action: "upload" })}", { method: "PUT", body: file });`],
            ["curl download", `curl -L "${signStorageUrl({ bucketId: bucket.id, key: objects[0]?.key ?? "path/file.txt", action: "download" })}" -o file`],
          ].map(([title, value]) => (
            <div key={title} className="snippet-card">
              <div className="row between"><strong>{title}</strong><CopyButton value={value} /></div>
              <pre>{value}</pre>
            </div>
          ))}
        </div>
        <p className="small">This MVP exposes Swyftstack signed URL APIs and console uploads. Full S3-compatible gateway support is not claimed until a gateway is wired.</p>
      </Panel>
    </UserShell>
  );
}
