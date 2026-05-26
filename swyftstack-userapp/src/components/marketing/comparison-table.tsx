// Reusable side-by-side comparison table for /vs and /migrate-from pages.
// Cells accept booleans (rendered as check/cross) or plain ReactNode.

import type { ReactNode } from "react";
import { CheckIcon, XIcon } from "./icons";

export type ComparisonColumn = {
  label: string;
  sublabel?: string;
  highlight?: boolean;
};

export type ComparisonRow = {
  label: string;
  /** Same length as `columns`. Booleans become check/cross; strings render as-is. */
  cells: (boolean | string | ReactNode)[];
};

export function ComparisonTable({
  columns,
  rows,
}: {
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}) {
  return (
    <div className="m-table-wrap">
      <table className="m-table">
        <thead>
          <tr>
            <th />
            {columns.map((c, i) => (
              <th key={i} className={c.highlight ? "highlight" : undefined}>
                <div style={{ fontWeight: 700 }}>{c.label}</div>
                {c.sublabel && <div style={{ fontSize: 12, color: "var(--m-text-muted)", marginTop: 2 }}>{c.sublabel}</div>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td style={{ fontWeight: 600, color: "var(--m-text)" }}>{r.label}</td>
              {r.cells.map((cell, ci) => (
                <td key={ci} className={columns[ci]?.highlight ? "highlight" : undefined}>
                  {renderCell(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderCell(cell: boolean | string | ReactNode): ReactNode {
  if (cell === true) return <span className="m-check"><CheckIcon size={18} /></span>;
  if (cell === false) return <span className="m-x"><XIcon size={16} /></span>;
  return cell;
}
