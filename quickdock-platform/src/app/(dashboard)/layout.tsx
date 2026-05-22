import { redirect } from "next/navigation";
import { requireAdmin, logout } from "@/lib/auth";
import { SidebarNav } from "@/components/sidebar-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  async function doLogout() {
    "use server";
    logout();
    redirect("/login");
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">Quickdock</div>
        <SidebarNav />
        <form action={doLogout} style={{ marginTop: 24 }}>
          <button className="btn secondary" style={{ width: "100%" }}>Sign out</button>
        </form>
        <div className="small" style={{ marginTop: 12 }}>{admin.email}</div>
      </aside>
      <main className="main">
        <div className="page-head">
          <div>
            <div className="small">Control plane</div>
            <div style={{ fontWeight: 700 }}>Operations console</div>
          </div>
          <div className="row">
            <span className="badge ok">Admin</span>
            <span className="small">{admin.email}</span>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
