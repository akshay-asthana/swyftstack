"use client";

// Interactive admin UI kit (§15). Server pages pass plain data + pre-rendered
// cells; these components handle search/sort/filter, menus, tabs and clipboard.
import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./icons";

// ---------------------------------------------------------------- DataTable
export interface DTColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "right";
}
export interface DTRow {
  id: string;
  href?: string;
  cells: React.ReactNode[];
  /** Plain primitives used for search/sort/filter (one per logical field). */
  values: Record<string, string | number>;
}
export interface DTFilter {
  key: string;
  label: string;
  options: string[];
}

export function DataTable({
  columns,
  rows,
  filters = [],
  searchPlaceholder = "Search…",
  emptyText = "No records.",
  pageSize = 25,
}: {
  columns: DTColumn[];
  rows: DTRow[];
  filters?: DTFilter[];
  searchPlaceholder?: string;
  emptyText?: string;
  pageSize?: number;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [active, setActive] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState(pageSize);

  const filtered = useMemo(() => {
    let r = rows;
    const needle = q.trim().toLowerCase();
    if (needle) {
      r = r.filter((row) =>
        Object.values(row.values).join(" ").toLowerCase().includes(needle),
      );
    }
    for (const [key, val] of Object.entries(active)) {
      if (val && val !== "__all__") {
        r = r.filter((row) => String(row.values[key] ?? "") === val);
      }
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a.values[sortKey];
        const bv = b.values[sortKey];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
        return String(av ?? "").localeCompare(String(bv ?? "")) * sortDir;
      });
    }
    return r;
  }, [rows, q, active, sortKey, sortDir]);

  const shown = filtered.slice(0, limit);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  return (
    <div>
      <div className="dt-toolbar">
        <div className="dt-search">
          <Icon name="search" size={15} />
          <input
            placeholder={searchPlaceholder}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {filters.map((f) => (
          <select
            key={f.key}
            className="dt-filter"
            value={active[f.key] ?? "__all__"}
            onChange={(e) => setActive((a) => ({ ...a, [f.key]: e.target.value }))}
          >
            <option value="__all__">{f.label}: all</option>
            {f.options.map((o) => (
              <option key={o} value={o}>
                {f.label}: {o}
              </option>
            ))}
          </select>
        ))}
        <span className="dt-count">
          {filtered.length} of {rows.length}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={c.sortable ? "sortable" : undefined}
                style={c.align === "right" ? { textAlign: "right" } : undefined}
                onClick={c.sortable ? () => toggleSort(c.key) : undefined}
              >
                {c.label}
                {c.sortable && (
                  <span className="sort-ind">
                    {sortKey === c.key ? (sortDir === 1 ? "▲" : "▼") : "↕"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="empty">
                {emptyText}
              </td>
            </tr>
          ) : (
            shown.map((row) => (
              <tr
                key={row.id}
                className={`dt-row${row.href ? " clickable" : ""}`}
                onClick={
                  row.href
                    ? (e) => {
                        // Don't hijack clicks on links/buttons inside the row.
                        if ((e.target as HTMLElement).closest("a,button,select,input")) return;
                        router.push(row.href!);
                      }
                    : undefined
                }
              >
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    style={columns[i]?.align === "right" ? { textAlign: "right" } : undefined}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {filtered.length > limit && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <button className="btn secondary" onClick={() => setLimit((l) => l + pageSize)}>
            Show more ({filtered.length - limit} hidden)
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- RowMenu
export function RowMenu({ children, label }: { children: React.ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="rowmenu" ref={ref}>
      <button
        className="rowmenu-btn"
        aria-label="Row actions"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="dots" size={16} />
      </button>
      {open && (
        <div className="rowmenu-pop" onClick={() => setOpen(false)}>
          {label && <div className="mlabel">{label}</div>}
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- CopyButton
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`copybtn${done ? " ok" : ""}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      <Icon name={done ? "check" : "copy"} size={12} />
      {done ? "Copied" : label}
    </button>
  );
}

// ---------------------------------------------------------------- SecretField
export function SecretField({ value, label }: { value: string; label?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="secret">
      {label && <span className="small">{label}</span>}
      <code>{shown ? value : "•".repeat(Math.min(20, value.length || 12))}</code>
      <button
        type="button"
        className="copybtn"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? "Hide" : "Reveal"}
      >
        <Icon name={shown ? "eyeOff" : "eye"} size={12} />
        {shown ? "Hide" : "Reveal"}
      </button>
      <CopyButton value={value} />
    </span>
  );
}

// ---------------------------------------------------------------- Tabs
export function Tabs({
  tabs,
}: {
  tabs: { id: string; label: string; icon?: IconName; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div className="ctabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`ctab${t.id === active ? " active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.icon && <Icon name={t.icon} size={13} />} {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}

// ---------------------------------------------------------------- ConfirmButton
// A submit button (use inside a <form action={serverAction}>) that asks for
// confirmation before the destructive server action runs.
export function ConfirmButton({
  children,
  message,
  className = "btn sm danger",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
