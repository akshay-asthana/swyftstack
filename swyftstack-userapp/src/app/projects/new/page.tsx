import { redirect } from "next/navigation";
import Link from "next/link";
import {
  prisma,
  encryptSecret,
  enqueueJob,
  projectActivity,
  provisionDatabase,
  provisionStorageBucket,
  randomSecret,
  sendTransactionalEmail,
  DatabaseLimitReachedError,
  NoClusterAvailableError,
  NoStorageProviderAvailableError,
  StorageBucketLimitReachedError,
} from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function loadWorkspace(userId: string) {
  return prisma.organization.findFirst({
    where: { ownerUserId: userId },
    orderBy: { createdAt: "asc" },
    include: {
      subscriptions: {
        where: { status: { in: ["active", "trialing", "past_due"] } }, orderBy: { createdAt: "desc" }, take: 1,
        include: { plan: { include: { limits: true } } },
      },
      _count: { select: { projects: true } },
    },
  });
}

async function createProject(formData: FormData) {
  "use server";
  const user = await requireUser();
  const workspace = await loadWorkspace(user.id);
  const subscription = workspace?.subscriptions[0];
  if (!workspace || !subscription) redirect("/pricing?next=/projects/new");

  const maxProjects = subscription.plan.limits?.maxProjects;
  if (maxProjects !== null && maxProjects !== undefined && workspace._count.projects >= maxProjects) {
    redirect("/pricing?next=/projects/new");
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/projects/new");
  const databaseMode = String(formData.get("databaseMode") ?? "new");
  const databaseName = String(formData.get("databaseName") ?? "").trim();
  const databasePasswordRaw = String(formData.get("databasePassword") ?? "");
  const bucketName = String(formData.get("bucketName") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();

  const baseSlug = slugify(name) || "project";
  let slug = baseSlug;
  let i = 2;
  while (await prisma.project.findUnique({ where: { organizationId_slug: { organizationId: workspace.id, slug } } })) {
    slug = `${baseSlug}-${i++}`;
  }

  const project = await prisma.project.create({
    data: {
      organizationId: workspace.id, name, slug, createdBy: user.id,
      status: (databaseMode !== "none" || bucketName) ? "provisioning" : "active",
      members: { create: { userId: user.id, role: "owner" } },
    },
  });
  await projectActivity(project.id, "project.created", user.id, { name });

  try {
    if (databaseMode === "new") {
      const generatedPassword = databasePasswordRaw.length >= 12 ? null : randomSecret(20);
      const db = await provisionDatabase({
        projectId: project.id,
        name: databaseName || `${project.slug}-db`,
        password: generatedPassword ?? databasePasswordRaw,
      });
      await projectActivity(project.id, "database.create_requested", user.id, { databaseId: db.id });
      if (generatedPassword && user.emailVerified) {
        await sendTransactionalEmail({
          to: user.email,
          subject: `Swyftstack database password for ${db.name}`,
          text:
            `A database password was generated for project "${project.name}".\n\n` +
            `Database: ${db.name}\nUsername: ${db.dbUser}\nPassword: ${generatedPassword}\n\n` +
            `Keep this secret. You can rotate it from the database page at any time.`,
        }).catch((mailError) =>
          projectActivity(project.id, "database.generated_password_email_failed", user.id, { error: String(mailError) }),
        );
      }
    } else if (databaseMode === "import") {
      if (!/^postgres(ql)?:\/\//i.test(sourceUrl)) redirect(`/projects/${project.id}?error=import_url#import-db`);
      const imp = await prisma.databaseImport.create({
        data: {
          projectId: project.id,
          targetDbName: databaseName || `${project.slug}-db`,
          sourceEngine: "postgres",
          sourceUrlEncrypted: encryptSecret(sourceUrl),
          saveSourceCredentials: formData.get("saveCredentials") === "on",
          createdBy: user.id,
          status: "queued",
        },
      });
      await enqueueJob("import_database_from_url", { importId: imp.id }, { priority: 40 });
      await projectActivity(project.id, "database.import_requested", user.id, { importId: imp.id });
    }

    if (bucketName) {
      const bucket = await provisionStorageBucket({
        projectId: project.id,
        bucketName,
        isPublic: formData.get("bucketPublic") === "on",
      });
      await projectActivity(project.id, "storage.bucket_requested", user.id, { bucketId: bucket.id });
    }
  } catch (err) {
    await prisma.project.update({ where: { id: project.id }, data: { status: "partially_failed" } });
    if (err instanceof DatabaseLimitReachedError) redirect(`/projects/${project.id}?error=db_limit`);
    if (err instanceof NoClusterAvailableError) redirect(`/projects/${project.id}?error=no_cluster`);
    if (err instanceof StorageBucketLimitReachedError) redirect(`/projects/${project.id}?error=bucket_limit`);
    if (err instanceof NoStorageProviderAvailableError) redirect(`/projects/${project.id}?error=no_storage_provider`);
    throw err;
  }
  redirect(`/projects/${project.id}`);
}

export default async function NewProjectPage() {
  const user = await requireUser();
  const workspace = await loadWorkspace(user.id);
  const subscription = workspace?.subscriptions[0];
  if (!workspace || !subscription) redirect("/pricing?next=/projects/new");

  const limit = subscription.plan.limits?.maxProjects;
  const remaining = limit == null ? "Unlimited" : Math.max(0, limit - workspace._count.projects);

  return (
    <UserShell user={user} workspace={workspace.name}>
      <div className="page-head">
        <div>
          <h1 className="h1">Create a project</h1>
          <p className="sub" style={{ marginBottom: 0 }}>
            A project groups your apps, databases and storage. <Link href="/projects">Back to projects</Link>
          </p>
        </div>
      </div>

      <div className="split">
        <div className="card">
          <form action={createProject}>
            <label>Project name</label>
            <input name="name" required autoFocus placeholder="Production API" />
            <p className="small muted" style={{ margin: "6px 0 0" }}>
              Region is chosen automatically by Swyftstack's provisioning defaults.
            </p>
            <div className="section-title" style={{ marginTop: 18 }}>Database</div>
            <label>Create or import database</label>
            <select name="databaseMode" defaultValue="new">
              <option value="new">Create new PostgreSQL database</option>
              <option value="import">Import existing PostgreSQL database</option>
              <option value="none">No database for now</option>
            </select>
            <label>Database name</label>
            <input name="databaseName" placeholder="production-db" />
            <label>Database password <span className="muted">(optional)</span></label>
            <input name="databasePassword" type="password" minLength={12} placeholder="leave empty to generate" />
            <label>Source database URL <span className="muted">(for imports)</span></label>
            <input name="sourceUrl" placeholder="postgresql://user:password@host:5432/dbname" />
            <label className="check" style={{ marginTop: 10 }}>
              <input type="checkbox" name="saveCredentials" /> Keep source credentials after import
            </label>

            <div className="section-title" style={{ marginTop: 18 }}>Object storage</div>
            <label>Storage bucket name <span className="muted">(optional)</span></label>
            <input name="bucketName" placeholder={`${slugify("Production API") || "project"}-assets`} />
            <label className="check" style={{ marginTop: 10 }}>
              <input type="checkbox" name="bucketPublic" /> Allow public object URLs
            </label>

            <div style={{ marginTop: 18 }}>
              <button className="btn"><Icon name="plus" size={15} /> Create project</button>
            </div>
          </form>
        </div>
        <div className="card">
          <div className="panel-title" style={{ marginBottom: 10 }}>Current plan</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{subscription.plan.name}</div>
          <p className="small" style={{ margin: "6px 0 0" }}>
            {workspace._count.projects} of {limit ?? "∞"} projects used · {remaining} remaining
          </p>
          <p className="small">Need more? <Link href="/pricing?next=/projects/new">Upgrade your plan</Link>.</p>
        </div>
      </div>
    </UserShell>
  );
}
