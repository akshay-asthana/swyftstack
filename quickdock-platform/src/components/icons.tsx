import React from "react";

// Lightweight inline stroke icons — no dependency, tree-shaken per use.
const P: Record<string, React.ReactNode> = {
  overview: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" /><path d="M16 4.5a3 3 0 0 1 0 6.5M17.5 20c0-2.6-1-4.4-2.6-5.4" /></>,
  org: <><path d="M3 21h18" /><rect x="4" y="9" width="7" height="12" rx="1" /><rect x="13" y="3" width="7" height="18" rx="1" /><path d="M7 13h1M7 17h1M16 7h1M16 11h1M16 15h1" /></>,
  projects: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h6a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
  apps: <><rect x="3" y="3" width="8" height="8" rx="1.6" /><rect x="13" y="3" width="8" height="8" rx="1.6" /><rect x="3" y="13" width="8" height="8" rx="1.6" /><rect x="13" y="13" width="8" height="8" rx="1.6" /></>,
  database: <><ellipse cx="12" cy="5.5" rx="8" ry="3" /><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>,
  storage: <><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /><path d="M7 7.5h.01M7 16.5h.01" /></>,
  nodes: <><rect x="4" y="4" width="16" height="6" rx="1.6" /><rect x="4" y="14" width="16" height="6" rx="1.6" /><path d="M8 7h.01M8 17h.01" /></>,
  backups: <><path d="M3 12a9 9 0 1 1 3 6.7" /><path d="M3 21v-5h5" /><path d="M12 8v4l3 2" /></>,
  migrations: <><path d="M4 7h13M13 3l4 4-4 4" /><path d="M20 17H7M11 13l-4 4 4 4" /></>,
  plans: <><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 10h18M7 15h5" /></>,
  usage: <><path d="M4 19V5M4 19h16" /><path d="M8 16l3.5-4.5L14 14l4-6" /></>,
  jobs: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  audit: <><path d="M6 3h9l5 5v13a0 0 0 0 1 0 0H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M14 3v5h5M8 13h8M8 17h5" /></>,
  infra: <><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="4" /><path d="M5 5l2.5 2.5M16.5 16.5L19 19M19 5l-2.5 2.5M7.5 16.5L5 19" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.4 1a7.6 7.6 0 0 0-2.6-1.5l-.4-2.6h-4l-.4 2.6a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.4z" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.3 9.3a2.8 2.8 0 0 1 5.4 1c0 1.8-2.7 2.4-2.7 4M12 17.5h.01" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1.5v3M15 1.5v3M9 19.5v3M15 19.5v3M1.5 9h3M1.5 15h3M19.5 9h3M19.5 15h3" /><rect x="9.5" y="9.5" width="5" height="5" rx="1" /></>,
  revenue: <><circle cx="12" cy="12" r="9" /><path d="M15 8.5c-.6-1-1.8-1.5-3-1.5-1.7 0-3 1-3 2.2 0 3 6 1.8 6 4.8 0 1.3-1.4 2.3-3 2.3-1.4 0-2.6-.6-3.2-1.6M12 5.5v13" /></>,
  rocket: <><path d="M12 3c3 0 6 2.5 6 7 0 3-1.5 5.5-3 7H9c-1.5-1.5-3-4-3-7 0-4.5 3-7 6-7z" /><circle cx="12" cy="9" r="1.8" /><path d="M9 17l-2.5 2.5M15 17l2.5 2.5M9 17c-2 .5-3 2-3 4 2 0 3.5-1 4-3" /></>,
  check: <><path d="M5 12.5l4.5 4.5L19 6.5" /></>,
  activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 4 6 4 9s-1.5 6.4-4 9c-2.5-2.6-4-6-4-9s1.5-6.4 4-9z" /></>,
  arrowUp: <><path d="M12 19V5M5 12l7-7 7 7" /></>,
  arrowDown: <><path d="M12 5v14M5 12l7 7 7-7" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11 8" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7L13 16" /></>,
  shield: <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></>,
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {P[name]}
    </svg>
  );
}
