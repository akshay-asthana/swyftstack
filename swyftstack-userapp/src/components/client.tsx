"use client";

// Customer-app interactive bits: clipboard + secret reveal for connection
// strings and credentials (§10).
import React, { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "./icons";

const BACKGROUND_FETCH_HEADER = "x-swyftstack-background";

export function TopLoadingBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const activeFetches = useRef(0);
  const hideTimer = useRef<number | null>(null);

  function begin() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setVisible(true);
    setProgress((p) => (p > 0 && p < 1 ? p : 0.08));
  }

  function complete() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setProgress(1);
    hideTimer.current = window.setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 180);
  }

  useEffect(() => {
    if (!visible) return;
    const iv = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 0.94) return p;
        return p + Math.max(0.012, (0.94 - p) * 0.16);
      });
    }, 180);
    return () => window.clearInterval(iv);
  }, [visible]);

  useEffect(() => {
    complete();
  }, [pathname, searchParams]);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const background = headerValue(init?.headers, BACKGROUND_FETCH_HEADER) === "1" ||
        (input instanceof Request && input.headers.get(BACKGROUND_FETCH_HEADER) === "1");
      if (!background) {
        activeFetches.current += 1;
        begin();
      }
      try {
        return await originalFetch(input, init);
      } finally {
        if (!background) {
          activeFetches.current = Math.max(0, activeFetches.current - 1);
          if (activeFetches.current === 0) complete();
        }
      }
    }) as typeof window.fetch;

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const current = `${window.location.pathname}${window.location.search}`;
      const next = `${url.pathname}${url.search}`;
      if (current === next) return;
      begin();
    };

    const onSubmit = () => {
      begin();
      window.setTimeout(() => {
        if (activeFetches.current === 0) complete();
      }, 900);
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.fetch = originalFetch;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  return (
    <div className={`top-loading-line${visible ? " active" : ""}`} aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

function headerValue(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) return null;
  try {
    return new Headers(headers).get(name);
  } catch {
    return null;
  }
}

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
