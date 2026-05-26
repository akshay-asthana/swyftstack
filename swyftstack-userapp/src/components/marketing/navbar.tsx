"use client";

// MarketingNavbar - controlled mega menu with hover bridge, click-to-open,
// keyboard support, and a separate mobile drawer with collapsible sections.
//
// Why controlled (vs the old CSS-only :hover/focus-within): the CSS approach
// dropped the menu the instant the cursor crossed the gap between trigger
// and panel. Here we keep an `open` state per trigger, plus a ~180ms close
// timeout that is cancelled when the cursor enters either the trigger or
// the panel itself - that gap is bridged by an invisible padding-top on
// `.m-mm-wrap`, so the cursor never actually leaves the controlled region.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  BoltIcon,
  BucketIcon,
  CloseIcon,
  CodeIcon,
  GlobeIcon,
  MenuIcon,
  MigrateIcon,
  PostgresIcon,
  ServerIcon,
  ShieldIcon,
  SparkleIcon,
  TerminalIcon,
} from "./icons";
import { ThemeToggle } from "./theme-toggle";

type MenuKey = "platform" | "solutions" | "resources" | null;

type MenuItem = {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
};

type MenuSection = {
  label?: string;
  items: MenuItem[];
};

type MenuConfig = {
  sections: MenuSection[];
  footer?: { label: string; href: string };
};

const COMPARE_ITEMS: MenuItem[] = [
  { href: "/supabase-alternative", icon: <PostgresIcon size={16} />, title: "Supabase alternative", desc: "Focused Postgres and storage without the platform sprawl." },
  { href: "/railway-alternative", icon: <ServerIcon size={16} />, title: "Railway alternative", desc: "Flat data-infra pricing for teams already hosting apps elsewhere." },
  { href: "/heroku-postgres-alternative", icon: <MigrateIcon size={16} />, title: "Heroku Postgres alternative", desc: "A faster, modern path off expensive legacy database tiers." },
  { href: "/render-alternative", icon: <GlobeIcon size={16} />, title: "Render alternative", desc: "Postgres deploys in seconds with storage and migration included." },
];

const MENU: Record<Exclude<MenuKey, null>, MenuConfig> = {
  platform: {
    sections: [
      {
        label: "Platform",
        items: [
          { href: "/postgres", icon: <PostgresIcon size={16} />, title: "Managed PostgreSQL", desc: "PG 16, SSL, daily backups, 47-second deploys." },
          { href: "/storage", icon: <BucketIcon size={16} />, title: "Object storage", desc: "S3-compatible API. CDN-fronted public buckets." },
          { href: "/static-sites", icon: <GlobeIcon size={16} />, title: "Static site deployment", desc: "Push a folder. Get a CDN-fronted HTTPS URL.", badge: "Free" },
          { href: "/migrate", icon: <MigrateIcon size={16} />, title: "Migration hub", desc: "Move your database in three clicks." },
        ],
      },
    ],
    footer: { label: "See platform overview", href: "/platform" },
  },
  solutions: {
    sections: [
      {
        items: [
          { href: "/backend-for-vibe-coded-apps", icon: <SparkleIcon size={16} />, title: "AI-built apps", desc: "Backend for Lovable, Bolt, Cursor, v0." },
          { href: "/nextjs-database", icon: <CodeIcon size={16} />, title: "Next.js database", desc: "Drop-in PostgreSQL + S3 for App Router." },
          { href: "/django-database", icon: <TerminalIcon size={16} />, title: "Django database", desc: "dj-database-url + django-storages." },
          { href: "/nodejs-database", icon: <ServerIcon size={16} />, title: "Node.js database", desc: "Standard Postgres for any Node framework." },
        ],
      },
    ],
    footer: { label: "Browse all integrations", href: "/platform" },
  },
  resources: {
    sections: [
      {
        label: "Learn",
        items: [
          { href: "/blog", icon: <BoltIcon size={16} />, title: "Blog", desc: "Engineering notes and deep-dives." },
          { href: "/announcements", icon: <SparkleIcon size={16} />, title: "Announcements", desc: "Changelog and product news." },
          { href: "/security", icon: <ShieldIcon size={16} />, title: "Security & trust", desc: "Uptime, encryption, compliance." },
          { href: "/about", icon: <TerminalIcon size={16} />, title: "About", desc: "Why we built Swyftstack." },
        ],
      },
      {
        label: "Compare",
        items: COMPARE_ITEMS,
      },
    ],
    footer: { label: "Start a migration", href: "/migrate" },
  },
};

export function MarketingNavbar({ signedIn, earlyAccess = false }: { signedIn: boolean; earlyAccess?: boolean }) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  // Close everything on route change.
  useEffect(() => {
    setOpenMenu(null);
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  // Close mega menu on outside click and on Escape.
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!navRef.current) return;
      if (!navRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpenMenu(null); setDrawerOpen(false); }
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const scheduleClose = useCallback((key: MenuKey) => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setOpenMenu((cur) => (cur === key ? null : cur));
    }, 180);
  }, [clearCloseTimer]);

  const openImmediately = useCallback((key: MenuKey) => {
    clearCloseTimer();
    setOpenMenu(key);
  }, [clearCloseTimer]);

  return (
    <header className="m-nav" role="banner">
      <div className="m-nav-inner" ref={navRef}>
        <Link className="m-brand" href="/" aria-label="Swyftstack home">
          <span className="m-brand-mark">S</span>
          <span>Swyftstack</span>
        </Link>

        <nav className="m-nav-links" aria-label="Primary">
          <NavTrigger
            label="Platform"
            menuKey="platform"
            openMenu={openMenu}
            onOpen={openImmediately}
            onScheduleClose={scheduleClose}
          />
          <NavTrigger
            label="Solutions"
            menuKey="solutions"
            openMenu={openMenu}
            onOpen={openImmediately}
            onScheduleClose={scheduleClose}
          />
          <NavTrigger
            label="Resources"
            menuKey="resources"
            openMenu={openMenu}
            onOpen={openImmediately}
            onScheduleClose={scheduleClose}
          />
          <NavLink href="/pricing" pathname={pathname}>Pricing</NavLink>
        </nav>

        <div className="m-nav-cta">
          <ThemeToggle />
          {signedIn ? (
            <Link className="m-btn m-btn-primary m-btn-sm" href="/console">
              Open console <ArrowRightIcon size={14} />
            </Link>
          ) : (
            <>
              <Link className="m-btn m-btn-ghost m-btn-sm m-nav-only-desktop" href={earlyAccess ? "/request-early-access" : "/login"}>
                {earlyAccess ? "Request access" : "Sign in"}
              </Link>
              <Link className="m-btn m-btn-primary m-btn-sm" href={earlyAccess ? "/request-early-access" : "/signup"}>
                {earlyAccess ? "Request early access" : "Start building"} <ArrowRightIcon size={14} />
              </Link>
            </>
          )}
          <button
            className="m-nav-burger"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            type="button"
          >
            {drawerOpen ? <CloseIcon size={18} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`m-mobile-drawer ${drawerOpen ? "open" : ""}`} aria-hidden={!drawerOpen}>
        <MobileSection label="Platform" sections={MENU.platform.sections} defaultOpen />
        <MobileSection label="Solutions" sections={MENU.solutions.sections} />
        <MobileSection label="Resources" sections={MENU.resources.sections} />
        <div className="m-md-section">
          <a className="m-md-summary" href="/pricing">Pricing</a>
        </div>
        <div className="m-mt-5" style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          {signedIn ? (
            <Link className="m-btn m-btn-primary m-btn-block" href="/console">Open console</Link>
          ) : (
            <>
              <Link className="m-btn m-btn-secondary m-btn-block" href={earlyAccess ? "/request-early-access" : "/login"}>
                {earlyAccess ? "Request access" : "Sign in"}
              </Link>
              <Link className="m-btn m-btn-primary m-btn-block" href={earlyAccess ? "/request-early-access" : "/signup"}>
                {earlyAccess ? "Request early access" : "Start building"}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ──────────────── controlled mega menu ──────────────── */

function NavTrigger({
  label,
  menuKey,
  openMenu,
  onOpen,
  onScheduleClose,
  align = "center",
}: {
  label: string;
  menuKey: Exclude<MenuKey, null>;
  openMenu: MenuKey;
  onOpen: (k: MenuKey) => void;
  onScheduleClose: (k: MenuKey) => void;
  align?: "center" | "right";
}) {
  const isOpen = openMenu === menuKey;
  const menu = MENU[menuKey];
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <div
      onMouseEnter={() => onOpen(menuKey)}
      onMouseLeave={() => onScheduleClose(menuKey)}
      style={{ position: "relative" }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="m-nav-item"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? onScheduleClose(menuKey) : onOpen(menuKey))}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            onOpen(menuKey);
          }
        }}
      >
        {label}
        <svg className="chev" viewBox="0 0 10 6" fill="none" aria-hidden>
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Wrapper provides hover bridge via padding-top; the cursor crossing
          from trigger → panel never leaves this element. */}
      <div
        className={`m-mm-wrap ${align === "right" ? "right" : ""}`}
        onMouseEnter={() => onOpen(menuKey)}
        onMouseLeave={() => onScheduleClose(menuKey)}
        style={{ visibility: isOpen ? "visible" : "hidden" }}
      >
        <div className={`m-mm ${isOpen ? "open" : ""}`} role="menu" aria-label={label}>
          {menu.sections.length === 1 ? (
            <div className="m-mm-grid">
              {menu.sections[0].items.map((it) => (
                <MegaMenuItem
                  key={it.href}
                  item={it}
                  menuKey={menuKey}
                  onScheduleClose={onScheduleClose}
                />
              ))}
            </div>
          ) : (
            <div className="m-mm-sections">
              {menu.sections.map((section) => (
                <div key={section.label} className="m-mm-section">
                  {section.label && <div className="m-mm-section-label">{section.label}</div>}
                  <div className="m-mm-section-items">
                    {section.items.map((it) => (
                      <MegaMenuItem
                        key={it.href}
                        item={it}
                        menuKey={menuKey}
                        onScheduleClose={onScheduleClose}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {menu.footer && (
            <div className="m-mm-footer">
              <span>One platform. One bill. No vendor lock-in.</span>
              <Link href={menu.footer.href}>{menu.footer.label} <ArrowRightIcon size={12} /></Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MegaMenuItem({
  item,
  menuKey,
  onScheduleClose,
}: {
  item: MenuItem;
  menuKey: Exclude<MenuKey, null>;
  onScheduleClose: (k: MenuKey) => void;
}) {
  return (
    <Link
      href={item.href}
      role="menuitem"
      onClick={() => onScheduleClose(menuKey)}
    >
      <span className="m-mm-icon" aria-hidden>{item.icon}</span>
      <span className="m-mm-text">
        <span className="m-mm-title">
          <span className="m-mm-title-text">{item.title}</span>
          {item.badge && <span className="m-mm-badge">{item.badge}</span>}
        </span>
        <span className="m-mm-desc">{item.desc}</span>
      </span>
    </Link>
  );
}

function NavLink({ href, pathname, children }: { href: string; pathname: string | null; children: React.ReactNode }) {
  const active = pathname === href;
  return (
    <Link href={href} className={`m-nav-item ${active ? "active" : ""}`}>{children}</Link>
  );
}

/* ──────────────── mobile drawer sections ──────────────── */

function MobileSection({
  label,
  sections,
  defaultOpen,
}: {
  label: string;
  sections: MenuSection[];
  defaultOpen?: boolean;
}) {
  return (
    <details className="m-md-section" open={defaultOpen}>
      <summary className="m-md-summary">{label}</summary>
      <div className="m-md-children">
        {sections.map((section) => (
          <div key={section.label ?? label} className="m-md-group">
            {section.label && <div className="m-md-group-title">{section.label}</div>}
            {section.items.map((it) => (
              <Link key={it.href} href={it.href}>
                <span aria-hidden>{it.icon}</span>
                <span>{it.title}</span>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}
