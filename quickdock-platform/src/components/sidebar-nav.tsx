"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { title: string; items: [string, string][] }[] = [
  {
    title: "Operate",
    items: [
      ["/", "Overview"],
      ["/nodes", "Nodes"],
      ["/jobs", "Jobs"],
      ["/migrations", "Migrations"],
    ],
  },
  {
    title: "Customers",
    items: [
      ["/users", "Users"],
      ["/organizations", "Organizations"],
      ["/projects", "Projects"],
    ],
  },
  {
    title: "Resources",
    items: [
      ["/apps", "Apps"],
      ["/databases", "Databases"],
      ["/buckets", "Storage Buckets"],
      ["/backups", "Backups"],
    ],
  },
  {
    title: "Commercial",
    items: [
      ["/plans", "Plans"],
      ["/usage", "Usage"],
      ["/audit-logs", "Audit Logs"],
    ],
  },
  {
    title: "System",
    items: [
      ["/infrastructure", "Infrastructure"],
      ["/settings", "Settings"],
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="nav">
      {NAV.map((group) => (
        <div key={group.title}>
          <div className="nav-section">{group.title}</div>
          {group.items.map(([href, label]) => {
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
