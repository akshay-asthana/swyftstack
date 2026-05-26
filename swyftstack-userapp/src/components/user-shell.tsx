import { redirect } from "next/navigation";
import Link from "next/link";
import { formatPublicId, prisma } from "swyftstack-shared";
import { logout } from "@/lib/auth";
import { UserNav } from "./user-nav";
import { ConsoleThemeToggle } from "./console-theme-toggle";
import { Icon } from "./icons";
import { timeAgo } from "./ui";
import {
  NotificationMenu,
  OrganizationSelect,
  SidebarCollapseToggle,
  type ShellNotification,
} from "./console-shell-client";

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

async function loadOrganizations(userId?: string) {
  if (!userId) return [];
  const organizations = await prisma.organization.findMany({
    where: { members: { some: { userId } }, status: { not: "deleted" } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  return organizations.map((org) => ({ id: formatPublicId("organization", org.id), name: org.name }));
}

export async function UserShell({
  user,
  organizationName,
  children,
}: {
  user: { id?: string; email: string; name: string | null; emailVerified?: boolean };
  organizationName?: string;
  children: React.ReactNode;
}) {
  const display = user.name || user.email;
  const initials = (display[0] ?? "U").toUpperCase();
  const [notifications, organizations] = await Promise.all([
    loadNotifications(user.id),
    loadOrganizations(user.id),
  ]);
  const activeOrganizationName = organizationName;
  const notificationItems: ShellNotification[] = notifications.items.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    severity: n.severity,
    unread: !n.readAt,
    href: n.actionUrl || "/console/notifications",
    time: timeAgo(n.createdAt),
  }));

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><Icon name="rocket" size={18} /></div>
          <div className="brand-copy">
            <div className="brand-name">Swyftstack</div>
            <div className="brand-sub">Cloud Platform</div>
          </div>
          <SidebarCollapseToggle />
        </div>
        {organizations.length > 0 && (
          <OrganizationSelect organizations={organizations} currentName={activeOrganizationName} />
        )}
        <UserNav />
        <div className="sidebar-foot">
          <div className="profile-card">
            <div className="avatar">{initials}</div>
            <div className="profile-meta">
              <div className="profile-name">{display}</div>
              <div className="profile-role">{activeOrganizationName ?? "Member"}</div>
            </div>
            <details className="profile-menu">
              <summary className="icon-btn" title="Account menu" aria-label="Account menu">
                <span aria-hidden>•••</span>
              </summary>
              <div className="profile-menu-panel">
                <Link href="/settings">Profile settings</Link>
                <form action={doLogout}>
                  <button type="submit"><Icon name="logout" size={14} /> Sign out</button>
                </form>
              </div>
            </details>
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
          <div className="row right">
            <Link className="small" href="/help">Docs</Link>
            <Link className="small" href="/help">Support</Link>
            <ConsoleThemeToggle />
            <NotificationMenu unread={notifications.unread} items={notificationItems} />
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
