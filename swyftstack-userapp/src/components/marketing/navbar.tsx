"use client";

// MarketingNavbar — controlled mega menu with hover bridge, click-to-open,
// keyboard support, and a separate mobile drawer with collapsible sections.
//
// Why controlled (vs the old CSS-only :hover/focus-within): the CSS approach
// dropped the menu the instant the cursor crossed the gap between trigger
// and panel. Here we keep an `open` state per trigger, plus a ~180ms close
// timeout that is cancelled when the cursor enters either the trigger or
// the panel itself — that gap is bridged by an invisible padding-top on
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

type MenuKey = "products" | "solutions" | "resources" | null;

type MenuItem = {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
};

const MENU: Record<Exclude<MenuKey, null>, { items: MenuItem[]; footer?: { label: string; href: string } }> = {
  products: {
    items: [
      { href: "/postgres", icon: <PostgresIcon size={16} />, title: "Managed PostgreSQL", desc: "PG 16, SSL, daily backups, 47-second deploys." },
      { href: "/storage", icon: <BucketIcon size={16} />, title: "Object storage", desc: "S3-compatible API. CDN-fronted public buckets." },
      { href: "/static-sites", icon: <GlobeIcon size={16} />, title: "Static site hosting", desc: "Custom domains, auto-HTTPS.", badge: "Free" },
      { href: "/migrate", icon: <MigrateIcon size={16} />, title: "Migration hub", desc: "Move your database in three clicks." },
    ],
    footer: { label: "See the whole platform", href: "/platform" },
  },
  solutions: {
    items: [
      { href: "/backend-for-vibe-coded-apps", icon: <SparkleIcon size={16} />, title: "AI-built apps", desc: "Backend for Lovable, Bolt, Cursor, v0." },
      { href: "/nextjs-database", icon: <CodeIcon size={16} />, title: "Next.js database", desc: "Drop-in PostgreSQL + S3 for App Router." },
      { href: "/django-database", icon: <TerminalIcon size={16} />, title: "Django database", desc: "dj-database-url + django-storages." },
      { href: "/nodejs-database", icon: <ServerIcon size={16} />, title: "Node.js database", desc: "Standard Postgres for any Node framework." },
    ],
    footer: { label: "Browse all integrations", href: "/platform" },
  },
  resources: {
    items: [
      { href: "/blog", icon: <BoltIcon size={16} />, title: "Blog", desc: "Engineering notes and deep-dives." },
      { href: "/announcements", icon: <SparkleIcon size={16} />, title: "Announcements", desc: "Changelog and product news." },
      { href: "/security", icon: <ShieldIcon size={16} />, title: "Security & trust", desc: "Uptime, encryption, compliance." },
      { href: "/about", icon: <TerminalIcon size={16} />, title: "About", desc: "Why we built Swyftstack." },
    ],
  },
};

export function MarketingNavbar({ signedIn }: { signedIn: boolean }) {
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
            label="Products"
            menuKey="products"
            openMenu={openMenu}
            onOpen={openImmediately}
            onScheduleClose={scheduleClose}
          />
          <NavLink href="/platform" pathname={pathname}>Platform</NavLink>
          <NavLink href="/pricing" pathname={pathname}>Pricing</NavLink>
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
            align="right"
            openMenu={openMenu}
            onOpen={openImmediately}
            onScheduleClose={scheduleClose}
          />
        </nav>

        <div className="m-nav-cta">
          <ThemeToggle />
          {signedIn ? (
            <Link className="m-btn m-btn-primary m-btn-sm" href="/console">
              Open console <ArrowRightIcon size={14} />
            </Link>
          ) : (
            <>
              <Link className="m-btn m-btn-ghost m-btn-sm m-nav-only-desktop" href="/login">Sign in</Link>
              <Link className="m-btn m-btn-primary m-btn-sm" href="/signup">
                Start building <ArrowRightIcon size={14} />
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
        <MobileSection label="Products" items={MENU.products.items} defaultOpen />
        <MobileSection label="Solutions" items={MENU.solutions.items} />
        <MobileSection label="Resources" items={MENU.resources.items} />
        <div className="m-md-section">
          <a className="m-md-summary" href="/pricing">Pricing</a>
        </div>
        <div className="m-md-section">
          <a className="m-md-summary" href="/platform">Platform</a>
        </div>
        <div className="m-mt-5" style={{ display: "flex", gap: 10, flexDirection: "column" }}>
          {signedIn ? (
            <Link className="m-btn m-btn-primary m-btn-block" href="/console">Open console</Link>
          ) : (
            <>
              <Link className="m-btn m-btn-secondary m-btn-block" href="/login">Sign in</Link>
              <Link className="m-btn m-btn-primary m-btn-block" href="/signup">Start building</Link>
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
          <div className="m-mm-grid">
            {menu.items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                role="menuitem"
                onClick={() => onScheduleClose(menuKey)}
              >
                <span className="m-mm-icon" aria-hidden>{it.icon}</span>
                <span className="m-mm-text">
                  <span className="m-mm-title">
                    <span className="m-mm-title-text">{it.title}</span>
                    {it.badge && <span className="m-mm-badge">{it.badge}</span>}
                  </span>
                  <span className="m-mm-desc">{it.desc}</span>
                </span>
              </Link>
            ))}
          </div>
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

function NavLink({ href, pathname, children }: { href: string; pathname: string | null; children: React.ReactNode }) {
  const active = pathname === href;
  return (
    <Link href={href} className={`m-nav-item ${active ? "active" : ""}`}>{children}</Link>
  );
}

/* ──────────────── mobile drawer sections ──────────────── */

function MobileSection({
  label,
  items,
  defaultOpen,
}: {
  label: string;
  items: MenuItem[];
  defaultOpen?: boolean;
}) {
  return (
    <details className="m-md-section" open={defaultOpen}>
      <summary className="m-md-summary">{label}</summary>
      <div className="m-md-children">
        {items.map((it) => (
          <Link key={it.href} href={it.href}>
            <span aria-hidden>{it.icon}</span>
            <span>{it.title}</span>
          </Link>
        ))}
      </div>
    </details>
  );
}
