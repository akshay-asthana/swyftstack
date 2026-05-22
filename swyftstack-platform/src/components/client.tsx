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
  useEffect(() => {
    const fromHash = window.location.hash.replace(/^#/, "");
    if (fromHash && tabs.some((t) => t.id === fromHash)) setActive(fromHash);
  }, [tabs]);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div className="ctabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`ctab${t.id === active ? " active" : ""}`}
            onClick={() => {
              setActive(t.id);
              window.history.replaceState(null, "", `#${t.id}`);
            }}
          >
            {t.icon && <Icon name={t.icon} size={13} />} {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}

type TerminalEntry = {
  id: number;
  stream: "stdout" | "stderr" | "system";
  text: string;
};

type TerminalEvent =
  | { type: "stdout" | "stderr"; chunk: string }
  | { type: "exit"; result: { exitCode: number | null; durationMs: number; ok: boolean } }
  | { type: "error"; message: string };

// ---------------------------------------------------------------- NodeTerminal
export function NodeTerminal({
  nodeId,
  defaultCommand,
}: {
  nodeId: string;
  defaultCommand: string;
}) {
  const [command, setCommand] = useState(defaultCommand);
  const [entries, setEntries] = useState<TerminalEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const screenRef = useRef<HTMLPreElement>(null);

  function append(stream: TerminalEntry["stream"], text: string) {
    setEntries((prev) => [
      ...prev,
      { id: ++seq.current, stream, text },
    ].slice(-800));
  }

  useEffect(() => {
    if (screenRef.current) screenRef.current.scrollTop = screenRef.current.scrollHeight;
  }, [entries]);

  async function run(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cmd = command.trim();
    if (!cmd || running) return;

    const abort = new AbortController();
    abortRef.current = abort;
    setEntries([{ id: ++seq.current, stream: "system", text: `$ ${cmd}\n` }]);
    setRunning(true);
    setStatus("running");

    try {
      const res = await fetch(`/api/admin/nodes/${nodeId}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, stream: true }),
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        append("stderr", `${await res.text()}\n`);
        setStatus("failed");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as TerminalEvent;
          if (event.type === "stdout") append("stdout", event.chunk);
          if (event.type === "stderr") append("stderr", event.chunk);
          if (event.type === "error") append("stderr", `${event.message}\n`);
          if (event.type === "exit") {
            const code = event.result.exitCode ?? "?";
            append("system", `\n[exit ${code} in ${event.result.durationMs}ms]\n`);
            setStatus(event.result.ok ? "completed" : "failed");
          }
        }
      }
    } catch (err) {
      if (abort.signal.aborted) {
        append("system", "\n[aborted]\n");
        setStatus("aborted");
      } else {
        append("stderr", `${err instanceof Error ? err.message : String(err)}\n`);
        setStatus("failed");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="terminal">
      <form className="terminal-form" onSubmit={run}>
        <span className="terminal-prompt">$</span>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          maxLength={1000}
          disabled={running}
        />
        <button className="btn" type="submit" disabled={running || !command.trim()}>
          <Icon name="activity" size={14} />
          Run
        </button>
        <button
          className="btn secondary"
          type="button"
          disabled={!running}
          onClick={() => abortRef.current?.abort()}
        >
          <Icon name="x" size={14} />
          Stop
        </button>
        {status && <span className="tag">{status}</span>}
      </form>
      <pre className="terminal-screen" ref={screenRef}>
        {entries.length === 0 ? (
          <span className="term-system">$ </span>
        ) : (
          entries.map((entry) => (
            <span key={entry.id} className={`term-${entry.stream}`}>{entry.text}</span>
          ))
        )}
      </pre>
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
