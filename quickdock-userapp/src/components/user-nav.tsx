"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

type Item = [href: string, label: string, icon: IconName];

const NAV: { title: string; items: Item[] }[] = [
  {
    title: "Workspace",
    items: [
      ["/", "Dashboard", "overview"],
      ["/projects", "Projects", "projects"],
      ["/usage", "Usage & Billing", "usage"],
    ],
  },
  {
    title: "Account",
    items: [
      ["/settings", "Settings", "settings"],
      ["/help", "Help & Support", "help"],
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function UserNav() {
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
