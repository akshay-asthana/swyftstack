// Tiny inline icon set used across the marketing site. All icons render at
// the supplied size with `currentColor` strokes so they inherit from text.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function PostgresIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.5" />
      <path d="M4.5 5.5v6.5c0 1.38 3.36 2.5 7.5 2.5s7.5-1.12 7.5-2.5V5.5" />
      <path d="M4.5 12v6.5c0 1.38 3.36 2.5 7.5 2.5s7.5-1.12 7.5-2.5V12" />
    </svg>
  );
}

export function BucketIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4 7h16l-1.5 12.2A2 2 0 0 1 16.5 21h-9a2 2 0 0 1-2-1.8L4 7Z" />
      <path d="M8 4h8l1 3H7l1-3Z" />
    </svg>
  );
}

export function ServerIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <circle cx="7" cy="7" r="0.6" fill="currentColor" />
      <circle cx="7" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function GlobeIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
    </svg>
  );
}

export function ArrowRightIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M5 12h14m-6-7 7 7-7 7" />
    </svg>
  );
}

export function CheckIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function XIcon({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function MenuIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ size = 22, ...rest }: IconProps) {
  return <XIcon size={size} {...rest} />;
}

export function ShieldIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 3 4.5 6v5c0 4.6 3.18 8.85 7.5 10 4.32-1.15 7.5-5.4 7.5-10V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function BoltIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M13 3 4 14h7l-1 7 9-11h-7l1-7Z" />
    </svg>
  );
}

export function MigrateIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M3 7h13m0 0-4-4m4 4-4 4" />
      <path d="M21 17H8m0 0 4 4m-4-4 4-4" />
    </svg>
  );
}

export function BackupIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M21 12a9 9 0 1 1-3.5-7.1" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

export function TeamIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-1a6 6 0 0 1 12 0v1" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15 21v-1a4 4 0 0 1 6.6-3" />
    </svg>
  );
}

export function GaugeIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M21 14a9 9 0 1 0-17.4 3" />
      <path d="m12 13 4-4" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

export function CodeIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
    </svg>
  );
}

export function LockIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 1 1 8 0v4" />
    </svg>
  );
}

export function ClockIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function TerminalIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </svg>
  );
}

export function SparkleIcon({ size = 22, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </svg>
  );
}

export function PlayIcon({ size = 14, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 5v14l12-7L7 5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
