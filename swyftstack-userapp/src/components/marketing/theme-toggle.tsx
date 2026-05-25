"use client";

// ThemeToggle — switches the marketing site between dark (default) and
// light themes. Persists the user's choice in localStorage. The toggle is
// scoped to marketing pages only: it flips a `data-m-theme` attribute on
// the nearest `.m` root, so the console (which uses a separate stylesheet)
// is unaffected.
//
// To avoid a flash of the wrong theme between SSR and first paint, the
// initial state is read synchronously inside useEffect, before any CSS
// transitions kick in — and any CSS transitions we add to theme tokens
// are disabled for the very first paint via the `m-theme-fluid` class.

import { useEffect, useState } from "react";

const STORAGE_KEY = "swyftstack:marketing-theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  // Apply to every .m root currently in the DOM. There's typically one,
  // but using a query handles edge cases (e.g. animated route transitions).
  const roots = document.querySelectorAll<HTMLElement>(".m");
  for (const root of roots) {
    if (theme === "light") root.setAttribute("data-m-theme", "light");
    else root.removeAttribute("data-m-theme");
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) as Theme | null;
    const initial: Theme = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
  }

  // Render the button server-side too so layout doesn't shift; the icon
  // updates after mount.
  const showLightIcon = theme === "dark";
  return (
    <button
      type="button"
      className="m-theme-toggle"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      suppressHydrationWarning
    >
      {mounted && showLightIcon ? (
        // Sun icon (we're dark → offer light)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon icon (we're light → offer dark)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
