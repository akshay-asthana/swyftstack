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
      {/* The actual animated network mesh, drawn on canvas. */}
      <NetworkMesh
        color={isHomeNet ? "#64aec8" : "#ff8008"}
        background="transparent"
        points={isHomeNet ? 44 : 36}
        maxDistance={isHomeNet ? 150 : 170}
        dotSize={isHomeNet ? 1.4 : 1.6}
        speed={isHomeNet ? 0.28 : 0.32}
      />
      {/* Bottom fade so the mesh dissolves cleanly into the page below. */}
      <div className="m-hero-bg-fade" />
    </div>
  );
}
