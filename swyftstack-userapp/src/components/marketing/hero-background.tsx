// HeroBackgroundAnimation - premium hero background built on a single
// lightweight canvas (NetworkMesh) plus two static radial-gradient layers.
//
// We deliberately removed the previous CSS animated `filter: blur()` /
// `hue-rotate()` aurora + three blurred floating orbs + the scanline.
// Those animated filters caused full-screen repaints every frame and were
// the root cause of the "whole site is hanging" complaint. The canvas
// mesh is heavily throttled, pauses offscreen, and respects reduced motion.

import { NetworkMesh } from "./network-mesh";

type HeroBackgroundVariant = "default" | "homeNet";

export function HeroBackgroundAnimation({ variant = "default" }: { variant?: HeroBackgroundVariant }) {
  const isHomeNet = variant === "homeNet";

  return (
    <div className={`m-hero-bg ${isHomeNet ? "m-hero-bg-home" : ""}`} aria-hidden>
      {/* Static base gradient - gives the hero its depth without animating. */}
      <div className="m-hero-bg-base" />
      {/* The actual animated network mesh, drawn on canvas. The home variant
          reads --vantacolor from theme.css so it can be retuned per theme.
          The default (non-home) variant uses --gradientcolor1 so a brand
          recolor in theme.css ripples through the rest of the hero set too.
          Sparser by design - the user asked to "reduce the number of nodes
          and lines" so it feels like a subtle infrastructure backdrop, not
          a busy graph. */}
      <NetworkMesh
        color={isHomeNet ? "var(--vantacolor)" : "var(--gradientcolor1)"}
        background="transparent"
        points={isHomeNet ? 32 : 28}
        maxDistance={isHomeNet ? 220 : 210}
        dotSize={isHomeNet ? 2.2 : 2.0}
        speed={isHomeNet ? 0.3 : 0.32}
      />
      {/* Bottom fade so the mesh dissolves cleanly into the page below. */}
      <div className="m-hero-bg-fade" />
    </div>
  );
}
