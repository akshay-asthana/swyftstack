"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";

export type ShellNotification = {
  id: string;
  title: string;
  message: string;
  severity: string;
  unread: boolean;
  href: string;
  time: string;
};

export function SidebarCollapseToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    return () => document.body.classList.remove("sidebar-collapsed");
  }, [collapsed]);

  return (
    <button
      className="icon-btn sidebar-collapse"
      type="button"
      onClick={() => setCollapsed((value) => !value)}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <span style={{ transform: collapsed ? "none" : "rotate(180deg)", display: "inline-flex" }}>
        <Icon name="chevronRight" size={15} />
      </span>
    </button>
  );
}

export function OrganizationSelect({
  organizations,
  currentName,
}: {
  organizations: { id: string; name: string }[];
  currentName?: string;
}) {
  const selected =
    organizations.find((org) => org.name === currentName)?.id ?? organizations[0]?.id ?? "";
  return (
    <div className="sidebar-org">
      <div className="sidebar-org-label">Organization</div>
      <select value={selected} aria-label="Organization" onChange={() => undefined}>
        {organizations.map((org) => (
          <option key={org.id} value={org.id}>{org.name}</option>
        ))}
      </select>
    </div>
  );
}

export function NotificationMenu({
  unread,
  items,
}: {
  unread: number;
  items: ShellNotification[];
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="notif-menu" ref={wrapRef}>
      <button
        className="icon-btn"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
        type="button"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="bell" size={16} />
        {unread > 0 && <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <strong>Notifications</strong>
            <Link href="/console/notifications" onClick={() => setOpen(false)}>View all</Link>
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">No notifications yet.</div>
          ) : (
            items.map((item) => (
              <Link
                key={item.id}
                className={`notif-item ${item.unread ? "unread" : ""} ${item.severity}`}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <span className="notif-dot" />
                <span className="notif-copy">
                  <span className="notif-title">{item.title}</span>
                  <span className="notif-msg">{item.message}</span>
                  <span className="notif-time">{item.time}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
