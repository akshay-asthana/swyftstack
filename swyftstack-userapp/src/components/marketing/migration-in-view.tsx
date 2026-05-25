"use client";

// MigrationInViewAnimation — wraps <MigrationAnimation /> so it only starts
// once the section scrolls into view. Uses IntersectionObserver with a 40%
// visibility threshold. Respects prefers-reduced-motion (the inner
// component checks that itself).
//
// Why a wrapper: the underlying animation auto-loops once started. If we
// kicked it off on initial paint, it would also kick off above-the-fold
// users into a long cycle that's been running invisibly for many seconds.
// Triggering on scroll keeps each visitor's first encounter fresh.

import { useEffect, useRef, useState } from "react";
import { MigrationAnimation } from "./migration-animation";

export function MigrationInViewAnimation() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActive(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {active
        ? <MigrationAnimation autoplay />
        // Render a static (idle) preview before the section enters view.
        // Keeps SSR layout identical to the running state so we don't shift.
        : <MigrationAnimation autoplay={false} />}
    </div>
  );
}
