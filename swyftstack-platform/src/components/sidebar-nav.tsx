"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

type Item = [href: string, label: string, icon: IconName];

const NAV: { title: string; items: Item[] }[] = [
  {
    title: "Operate",
    items: [
      ["/", "Overview", "overview"],
      ["/infra-overview", "Infrastructure", "infra"],
      ["/nodes", "Nodes", "nodes"],
      ["/jobs", "Jobs", "jobs"],
      ["/migrations", "Migrations", "migrations"],
    ],
  },
  {
    title: "Customers",
    items: [
      ["/users", "Users", "users"],
      ["/organizations", "Organizations", "org"],
      ["/projects", "Projects", "projects"],
    ],
  },
  {
    title: "Resources",
    items: [
      ["/apps", "Apps", "apps"],
      ["/databases", "Databases", "database"],
      ["/buckets", "Storage", "storage"],
      ["/backups", "Backups", "backups"],
    ],
  },
  {
    title: "Commercial",
    items: [
      ["/plans", "Plans & Limits", "plans"],
      ["/usage", "Usage & Billing", "usage"],
      ["/audit-logs", "Logs & Audit", "audit"],
    ],
  },
  {
    title: "System",
    items: [
      ["/infrastructure", "Providers", "infra"],
      ["/help", "Help & Guides", "help"],
      ["/settings", "Settings", "settings"],
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
          {group.items.map(([href, label, icon]) => {
            const active = isActive(pathname, href);
            return (
              <Link key={href} href={href} className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}>
                <span className="nav-ico"><Icon name={icon} size={17} /></span>
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
