import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "swyftstack-shared";
import { logout } from "@/lib/auth";
import { UserNav } from "./user-nav";
import { ConsoleThemeToggle } from "./console-theme-toggle";
import { Icon } from "./icons";
import { timeAgo } from "./ui";

async function doLogout() {
  "use server";
  await logout();
  redirect("/login");
}

async function loadNotifications(userId?: string) {
  if (!userId) return { unread: 0, items: [] as Awaited<ReturnType<typeof prisma.notification.findMany>> };
  const [unread, items] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null, dismissedAt: null } }),
    prisma.notification.findMany({
      where: { userId, dismissedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return { unread, items };
}

export async function UserShell({
  user,
  workspace,
  children,
}: {
  user: { id?: string; email: string; name: string | null; emailVerified?: boolean };
  workspace?: string;
  children: React.ReactNode;
}) {
  const display = user.name || user.email;
  const initials = (display[0] ?? "U").toUpperCase();
  const notifications = await loadNotifications(user.id);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><Icon name="rocket" size={18} /></div>
          <div>
            <div className="brand-name">Swyftstack</div>
            <div className="brand-sub">Cloud Platform</div>
          </div>
        </div>
        <UserNav />
        <div className="sidebar-foot">
          <div className="profile-card">
            <div className="avatar">{initials}</div>
            <div className="profile-meta">
              <div className="profile-name">{display}</div>
              <div className="profile-role">{workspace ?? "Member"}</div>
            </div>
            <form action={doLogout} style={{ marginLeft: "auto" }}>
              <button className="icon-btn" title="Sign out" style={{ width: 30, height: 30 }}>
                <Icon name="logout" size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="content-col">
        <header className="topbar">
          <div className="topbar-search">
            <Icon name="search" size={15} />
            <input placeholder="Search projects, databases, buckets..." aria-label="Search" />
            <kbd>/</kbd>
          </div>
          {workspace && (
            <span className="org-switch">
              <Icon name="org" size={15} />
              {workspace}
            </span>
          )}
          <div className="row right">
            <Link className="small" href="/help">Docs</Link>
            <Link className="small" href="/help">Support</Link>
            <ConsoleThemeToggle />
            <details className="notif-menu">
              <summary className="icon-btn" title="Notifications" aria-label="Notifications">
                <Icon name="bell" size={16} />
                {notifications.unread > 0 && <span className="notif-badge">{notifications.unread > 9 ? "9+" : notifications.unread}</span>}
              </summary>
              <div className="notif-panel">
                <div className="notif-head">
                  <strong>Notifications</strong>
                  <Link href="/console/notifications">View all</Link>
                </div>
                {notifications.items.length === 0 ? (
                  <div className="notif-empty">No notifications yet.</div>
                ) : (
                  notifications.items.map((n) => (
                    <Link
                      key={n.id}
                      className={`notif-item ${n.readAt ? "" : "unread"} ${n.severity}`}
                      href={n.actionUrl || "/console/notifications"}
                    >
                      <span className="notif-dot" />
                      <span className="notif-copy">
                        <span className="notif-title">{n.title}</span>
                        <span className="notif-msg">{n.message}</span>
                        <span className="notif-time">{timeAgo(n.createdAt)}</span>
                      </span>
                    </Link>
                  ))
                )}
              </div>
            </details>
            <div className="avatar" title={user.email}>{initials}</div>
          </div>
        </header>
        <main className="main">
          {user.emailVerified === false && (
            <div className="note verify-note">
              Verify your email to receive security notifications and one-time generated credentials.
              <Link href="/verify-email"> Send verification link</Link>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
