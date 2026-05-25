"use client";

// CodeSnippet - terminal-like multi-tab code viewer. Highlighting is a
// deliberately tiny regex pass so we don't ship a real syntax engine for the
// landing page. Use one of the helpers (sql, js, py, sh, prisma) when
// building snippet sets.
import { useState, type ReactNode } from "react";

export type Snippet = {
  name: string;
  language: "ts" | "js" | "py" | "sh" | "sql" | "prisma" | "php" | "env" | "text";
  code: string;
};

export function CodeSnippet({
  snippets,
  fileLabel,
  defaultIndex = 0,
}: {
  snippets: Snippet[];
  fileLabel?: string;
  defaultIndex?: number;
}) {
  const [active, setActive] = useState(defaultIndex);
  const current = snippets[active];
  return (
    <div className="m-code">
      <div className="m-code-header">
        <div className="m-code-dots" aria-hidden>
          <span /><span /><span />
        </div>
        {snippets.length > 1 ? (
          <div className="m-code-tabs" role="tablist">
            {snippets.map((s, i) => (
              <button
                key={s.name}
                type="button"
                className={`m-code-tab ${i === active ? "active" : ""}`}
                onClick={() => setActive(i)}
                role="tab"
                aria-selected={i === active}
              >
                {s.name}
              </button>
            ))}
          </div>
        ) : (
          <span className="m-code-name">{fileLabel ?? snippets[0]?.name}</span>
        )}
        <span className="m-code-name" aria-hidden>{fileLabel ?? ""}</span>
      </div>
      <div className="m-code-body">
        <pre>{highlight(current?.code ?? "", current?.language ?? "text")}</pre>
      </div>
    </div>
  );
}

// Server variant for non-interactive use (e.g. inside articles or sections
// that should not push a client bundle).
export function StaticCode({
  code,
  language = "text",
  name,
}: {
  code: string;
  language?: Snippet["language"];
  name?: string;
}) {
  return (
    <div className="m-code">
      <div className="m-code-header">
        <div className="m-code-dots" aria-hidden><span /><span /><span /></div>
        <span className="m-code-name">{name ?? language}</span>
        <span className="m-code-name" />
      </div>
      <div className="m-code-body">
        <pre>{highlight(code, language)}</pre>
      </div>
    </div>
  );
}

// ---- minimal highlighter --------------------------------------------------
// Keep this tiny. The marketing site doesn't need perfect tokenization; it
// just needs the snippet to feel alive.
function span(cls: string, text: string, key: number) {
  return <span key={key} className={cls}>{text}</span>;
}

function highlight(code: string, lang: Snippet["language"]): ReactNode {
  if (!code) return null;
  const patterns: Array<{ re: RegExp; cls: string }> = (() => {
    if (lang === "sql") {
      return [
        { re: /(--[^\n]*)/g, cls: "m-tok-cmt" },
        { re: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|ON|AND|OR|NOT|INTO|VALUES|CREATE|TABLE|PRIMARY|KEY|REFERENCES|NULL|DEFAULT|AS|RETURNING|LIMIT|ORDER\s+BY|GROUP\s+BY)\b/gi, cls: "m-tok-key" },
        { re: /'[^']*'/g, cls: "m-tok-str" },
        { re: /\$\d+/g, cls: "m-tok-var" },
      ];
    }
    if (lang === "sh") {
      return [
        { re: /(#[^\n]*)/g, cls: "m-tok-cmt" },
        { re: /(["'])(?:\\.|(?!\1).)*\1/g, cls: "m-tok-str" },
        { re: /\$[A-Za-z_][A-Za-z0-9_]*/g, cls: "m-tok-var" },
        { re: /^([A-Za-z_]+)/gm, cls: "m-tok-fn" },
      ];
    }
    if (lang === "env") {
      return [
        { re: /(#[^\n]*)/g, cls: "m-tok-cmt" },
        { re: /^([A-Z][A-Z0-9_]*)/gm, cls: "m-tok-key" },
        { re: /(["'])(?:\\.|(?!\1).)*\1/g, cls: "m-tok-str" },
      ];
    }
    if (lang === "py") {
      return [
        { re: /(#[^\n]*)/g, cls: "m-tok-cmt" },
        { re: /(["'])(?:\\.|(?!\1).)*\1/g, cls: "m-tok-str" },
        { re: /\b(import|from|as|def|return|class|if|else|elif|with|in|for|try|except|raise|None|True|False)\b/g, cls: "m-tok-key" },
        { re: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, cls: "m-tok-fn" },
      ];
    }
    if (lang === "php") {
      return [
        { re: /(\/\/[^\n]*)/g, cls: "m-tok-cmt" },
        { re: /(["'])(?:\\.|(?!\1).)*\1/g, cls: "m-tok-str" },
        { re: /\b(env|use|return|new|function|class|public|private|protected|static)\b/g, cls: "m-tok-key" },
        { re: /\$[A-Za-z_][A-Za-z0-9_]*/g, cls: "m-tok-var" },
      ];
    }
    if (lang === "prisma") {
      return [
        { re: /\/\/[^\n]*/g, cls: "m-tok-cmt" },
        { re: /"[^"]*"/g, cls: "m-tok-str" },
        { re: /\b(datasource|generator|model|enum|provider|url|env)\b/g, cls: "m-tok-key" },
      ];
    }
    // default: ts / js
    return [
      { re: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, cls: "m-tok-cmt" },
      { re: /(["'`])(?:\\.|(?!\1).)*\1/g, cls: "m-tok-str" },
      { re: /\b(import|from|as|export|const|let|var|function|return|if|else|new|await|async|of|in|class|extends|interface|type|true|false|null|undefined)\b/g, cls: "m-tok-key" },
      { re: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, cls: "m-tok-fn" },
    ];
  })();
  return tokenize(code, patterns);
}

function tokenize(code: string, patterns: Array<{ re: RegExp; cls: string }>): ReactNode {
  type Mark = { start: number; end: number; cls: string };
  const marks: Mark[] = [];
  for (const { re, cls } of patterns) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(code))) {
      // For patterns with a capture group, anchor on the captured token only.
      const text = match[1] ?? match[0];
      const start = match.index + match[0].indexOf(text);
      const end = start + text.length;
      if (text.length === 0) continue;
      // Skip if already inside an earlier mark (priority by order).
      if (marks.some((m) => start < m.end && end > m.start)) continue;
      marks.push({ start, end, cls });
    }
  }
  marks.sort((a, b) => a.start - b.start);
  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const m of marks) {
    if (m.start > cursor) out.push(code.slice(cursor, m.start));
    out.push(span(m.cls, code.slice(m.start, m.end), key++));
    cursor = m.end;
  }
  if (cursor < code.length) out.push(code.slice(cursor));
  return out;
}
