import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "swyftstack-shared";
import { requireUser } from "@/lib/auth";
import { UserShell } from "@/components/user-shell";
import { Badge, Panel, timeAgo } from "@/components/ui";

export const dynamic = "force-dynamic";

function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

async function markRead(formData: FormData) {
  "use server";
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: str(formData, "id"), userId: user.id },
    data: { readAt: new Date() },
  });
  revalidatePath("/console/notifications");
}

async function dismissNotification(formData: FormData) {
  "use server";
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { id: str(formData, "id"), userId: user.id },
    data: { dismissedAt: new Date(), readAt: new Date() },
  });
  revalidatePath("/console/notifications");
}

async function markAllRead() {
  "use server";
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, dismissedAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/console/notifications");
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: { filter?: string };
}) {
  const user = await requireUser();
  const filter = searchParams?.filter === "unread" ? "unread" : "all";
  const [org, notifications, unread] = await Promise.all([
    prisma.organization.findFirst({
      where: { members: { some: { userId: user.id } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.notification.findMany({
      where: {
        userId: user.id,
        dismissedAt: null,
        ...(filter === "unread" ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null, dismissedAt: null } }),
  ]);

  return (
    <UserShell user={user} organizationName={org?.name}>
      <div className="page-head">
        <div>
          <h1 className="h1">Notifications</h1>
          <p className="sub">Usage alerts, onboarding notes, and system messages for your organization.</p>
        </div>
        <form action={markAllRead}>
          <button className="btn secondary" type="submit" disabled={unread === 0}>Mark all read</button>
        </form>
      </div>

      <div className="row" style={{ marginBottom: 14 }}>
        <Link className={`btn sm ${filter === "all" ? "" : "secondary"}`} href="/console/notifications">All</Link>
        <Link className={`btn sm ${filter === "unread" ? "" : "secondary"}`} href="/console/notifications?filter=unread">
          Unread{unread > 0 ? ` (${unread})` : ""}
        </Link>
      </div>

      <Panel title="Inbox" flush>
        {notifications.length === 0 ? (
          <div className="empty-inline">No notifications to show.</div>
        ) : (
          <div className="notification-list">
            {notifications.map((n) => (
              <div key={n.id} className={`notification-row ${n.readAt ? "" : "unread"}`}>
                <div className={`notif-dot ${n.severity}`} />
                <div className="notification-main">
                  <div className="row between">
                    <div className="row row-tight">
                      <strong>{n.title}</strong>
                      <Badge status={n.severity} />
                      {!n.readAt && <Badge status="pending" />}
                    </div>
                    <span className="small">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p>{n.message}</p>
                  <div className="row row-tight">
                    {n.actionUrl && (
                      <Link className="btn sm secondary" href={n.actionUrl}>{n.actionLabel ?? "Open"}</Link>
                    )}
                    {!n.readAt && (
                      <form action={markRead}>
                        <input type="hidden" name="id" value={n.id} />
                        <button className="btn sm secondary" type="submit">Mark read</button>
                      </form>
                    )}
                    <form action={dismissNotification}>
                      <input type="hidden" name="id" value={n.id} />
                      <button className="btn sm secondary" type="submit">Dismiss</button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </UserShell>
  );
}
