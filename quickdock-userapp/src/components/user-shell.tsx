import { redirect } from "next/navigation";
import Link from "next/link";
import { logout } from "@/lib/auth";
import { UserNav } from "./user-nav";
import { Icon } from "./icons";

async function doLogout() {
  "use server";
  logout();
  redirect("/login");
}

export function UserShell({
  user,
  workspace,
  children,
}: {
  user: { email: string; name: string | null };
  workspace?: string;
  children: React.ReactNode;
}) {
  const display = user.name || user.email;
  const initials = (display[0] ?? "U").toUpperCase();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><Icon name="rocket" size={18} /></div>
          <div>
            <div className="brand-name">Quickdock</div>
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
          {workspace && (
            <span className="org-switch">
              <Icon name="org" size={15} />
              {workspace}
            </span>
          )}
          <div className="row right">
            <Link className="small" href="/help">Docs</Link>
            <Link className="small" href="/help">Support</Link>
            <button className="icon-btn" title="Notifications"><Icon name="bell" size={16} /></button>
            <div className="avatar" title={user.email}>{initials}</div>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
