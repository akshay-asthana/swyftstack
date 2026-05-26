"use client";

// MigrationAnimation - the headline interactive on the homepage. User types
// (or accepts the prefilled value), clicks Migrate, sees the progress bar
// fill across ~2s, then a success state with a fresh Swyftstack connection
// string. Respects prefers-reduced-motion. Loops by resetting after a beat
// so the animation is still useful for visitors who don't interact.
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, CheckIcon, MigrateIcon, PostgresIcon } from "./icons";
import swyftstackLogo from "@/brand-assets/swyftstack-logo.png";

type Phase = "idle" | "connecting" | "dumping" | "restoring" | "verifying" | "done";

const STEPS: { phase: Phase; label: string; durationMs: number }[] = [
  { phase: "connecting", label: "Connecting to source", durationMs: 380 },
  { phase: "dumping", label: "Streaming pg_dump", durationMs: 620 },
  { phase: "restoring", label: "Restoring to Swyftstack", durationMs: 620 },
  { phase: "verifying", label: "Verifying checksums", durationMs: 420 },
];

const DEFAULT_INPUT = "postgresql://app:••••••@db.supabase.co:5432/postgres";

export function MigrationAnimation({ autoplay = true }: { autoplay?: boolean } = {}) {
  const [value, setValue] = useState(DEFAULT_INPUT);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const timers = useRef<NodeJS.Timeout[]>([]);
  const reducedMotion = useReducedMotion();

  function clearTimers() {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }
  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }

  function run() {
    clearTimers();
    setPhase("connecting");
    setProgress(8);
    let elapsed = 0;
    const total = STEPS.reduce((s, x) => s + x.durationMs, 0);
    for (let i = 0; i < STEPS.length; i++) {
      const step = STEPS[i];
      elapsed += step.durationMs;
      const next = STEPS[i + 1]?.phase ?? "done";
      const pct = Math.round((elapsed / total) * 100);
      schedule(() => {
        setPhase(next);
        setProgress(pct);
      }, elapsed);
    }
    // After "done" sits for ~3.5s, loop back to idle so the animation keeps
    // teaching anyone who's just looking at the section.
    schedule(() => reset(), total + 3600);
  }

  function reset() {
    clearTimers();
    setPhase("idle");
    setProgress(0);
  }

  useEffect(() => {
    if (!autoplay) return;
    if (reducedMotion) return; // respect user preference; do not autoplay
    // Autoplay once after a brief delay so visitors see the animation work
    // without having to click. The loop above keeps it cycling thereafter.
    const id = setTimeout(run, 1400);
    timers.current.push(id);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, autoplay]);

  const isRunning = phase !== "idle" && phase !== "done";
  const stepIdx = STEPS.findIndex((s) => s.phase === phase);

  return (
    <div className="m-migration" aria-live="polite">
      <div className="m-migration-row">
        <label htmlFor="m-migrate-input" className="m-migration-input">
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em" }}>DATABASE_URL</span>
          <input
            id="m-migrate-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            style={{
              flex: 1, minWidth: 0, all: "unset",
              fontFamily: "var(--m-font-mono)", fontSize: 13,
              color: "var(--m-text-strong)",
            }}
          />
        </label>
        <button
          type="button"
          className="m-btn m-btn-primary m-migration-cta"
          onClick={isRunning ? undefined : run}
          disabled={isRunning}
        >
          {isRunning ? "Migrating…" : phase === "done" ? "Migrated" : "Migrate"}
          <MigrateIcon size={16} />
        </button>
      </div>

      <div className="m-migration-pipe">
        <div className="m-migration-pill">
          <PostgresIcon size={18} />
          <div style={{ minWidth: 0 }}>
            <div className="label">Source</div>
            <div className="name">Your current Postgres</div>
          </div>
        </div>
        <div className="m-migration-arrow" aria-hidden>
          {(isRunning || phase === "done") && <span className="m-migration-dot" />}
        </div>
        <div className="m-migration-pill">
          <Image src={swyftstackLogo} alt="" width={22} height={22} className="m-brand-mark" />
          <div style={{ minWidth: 0 }}>
            <div className="label">Destination</div>
            <div className="name">Swyftstack PostgreSQL 16</div>
          </div>
        </div>
      </div>

      <div className="m-migration-progress">
        <div className={`m-migration-bar ${isRunning || phase === "done" ? "bar-anim" : ""}`}
          role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="m-migration-steps">
          {STEPS.map((s, i) => {
            const state = i < stepIdx || phase === "done" ? "done" : i === stepIdx ? "active" : "";
            return (
              <span key={s.label} className={`m-migration-step ${state}`}>
                {state === "done" ? <CheckIcon size={12} /> : <Dot />} {s.label}
              </span>
            );
          })}
        </div>
        {phase === "done" && (
          <div className="m-migration-success">
            <CheckIcon size={18} />
            <span>Database migrated. Your new connection string is ready:</span>
            <code style={{ marginLeft: "auto", fontFamily: "var(--m-font-mono)", fontSize: 12, color: "var(--m-text-strong)" }}>
              postgresql://…@db.swyftstack.com:5432/app <ArrowRightIcon size={12} />
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

function Dot() {
  return <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mq.matches);
    handler();
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return reduced;
}
