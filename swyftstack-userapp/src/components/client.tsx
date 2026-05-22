"use client";

// Customer-app interactive bits: clipboard + secret reveal for connection
// strings and credentials (§10).
import React, { useState } from "react";
import { Icon } from "./icons";

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

export function SecretField({ value, mono = true }: { value: string; mono?: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="secret">
      <code style={mono ? undefined : { fontFamily: "inherit" }}>
        {shown ? value : "•".repeat(Math.min(24, value.length || 14))}
      </code>
      <button type="button" className="copybtn" onClick={() => setShown((s) => !s)}>
        <Icon name={shown ? "eyeOff" : "eye"} size={12} />
        {shown ? "Hide" : "Reveal"}
      </button>
      <CopyButton value={value} />
    </span>
  );
}

export function Tabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
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
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
