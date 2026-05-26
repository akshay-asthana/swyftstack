"use client";

import { useEffect, useState } from "react";

type ConsoleTheme = "light" | "dark";

const STORAGE_KEY = "swyftstack:console-theme";

function applyConsoleTheme(theme: ConsoleTheme) {
  document.documentElement.dataset.consoleTheme = theme;
}

export function ConsoleThemeToggle() {
  const [theme, setTheme] = useState<ConsoleTheme>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ConsoleTheme | null;
    const next = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(next);
    applyConsoleTheme(next);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyConsoleTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      className="icon-btn theme-switch"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch console to ${theme === "dark" ? "light" : "dark"} theme`}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
    >
      {theme === "dark" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
