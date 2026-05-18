import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin, logout } from "@/lib/auth";

const NAV: [string, string][] = [
  ["/", "Overview"],
  ["/nodes", "Nodes"],
  ["/users", "Users"],
  ["/organizations", "Organizations"],
  ["/projects", "Projects"],
  ["/apps", "Apps"],
  ["/databases", "Databases"],
  ["/buckets", "Storage Buckets"],
  ["/plans", "Plans"],
  ["/usage", "Usage"],
  ["/jobs", "Jobs"],
  ["/backups", "Backups"],
  ["/audit-logs", "Audit Logs"],
  ["/migrations", "Migrations"],
  ["/infrastructure", "Infrastructure"],
  ["/settings", "Settings"],
];

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
        <nav className="nav">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
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
