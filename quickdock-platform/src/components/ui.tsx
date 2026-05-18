import React from "react";

const OK = ["active", "running", "live", "verified", "succeeded", "completed", "accepted"];
const WARN = ["provisioning", "draining", "degraded", "building", "deploying", "queued", "retrying", "pending", "warning", "over_limit", "past_due", "restoring", "uploading"];
const BAD = ["offline", "disabled", "failed", "suspended", "deleted", "cancelled", "expired", "rolled_back", "limit_reached"];

export function Badge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const cls = OK.includes(s) ? "ok" : WARN.includes(s) ? "warn" : BAD.includes(s) ? "bad" : "muted";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function Stat({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="card">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

export function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <table>
      <thead>
        <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} className="small">No records.</td></tr>
        ) : (
          rows.map((r, i) => (
            <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))
        )}
      </tbody>
    </table>
  );
}

export function bytes(n: bigint | number | null | undefined): string {
  if (n === null || n === undefined) return "∞";
  let v = Number(n);
  const u = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}
