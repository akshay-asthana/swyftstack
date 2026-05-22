import { redirect } from "next/navigation";
import { requireAdmin, logout } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";
import { Icon } from "@/components/icons";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const initials = (admin.email[0] ?? "A").toUpperCase();

  async function doLogout() {
    "use server";
    logout();
    redirect("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><Icon name="rocket" size={18} /></div>
          <div>
            <div className="brand-name">Swyftstack</div>
            <div className="brand-sub">Control Panel</div>
          </div>
        </div>
        <SidebarNav />
        <div className="sidebar-foot">
          <div className="profile-card">
            <div className="avatar">{initials}</div>
            <div className="profile-meta">
              <div className="profile-name">{admin.email}</div>
              <div className="profile-role">Super Administrator</div>
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
            <input placeholder="Search nodes, projects, users…" aria-label="Search" />
            <kbd>⌘K</kbd>
          </div>
          <div className="row right row-tight">
            <span className="badge ok plain">All systems operational</span>
            <button className="icon-btn" title="Notifications"><Icon name="bell" size={16} /></button>
            <div className="avatar" title={admin.email}>{initials}</div>
          </div>
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
