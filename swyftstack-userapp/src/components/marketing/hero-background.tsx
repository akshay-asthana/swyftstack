// HeroBackgroundAnimation — premium hero background built on a single
// lightweight canvas (NetworkMesh) plus two static radial-gradient layers.
//
// We deliberately removed the previous CSS animated `filter: blur()` /
// `hue-rotate()` aurora + three blurred floating orbs + the scanline.
// Those animated filters caused full-screen repaints every frame and were
// the root cause of the "whole site is hanging" complaint. The canvas
// mesh is heavily throttled, pauses offscreen, and respects reduced motion.

import { NetworkMesh } from "./network-mesh";

export function HeroBackgroundAnimation() {
  return (
    <div className="m-hero-bg" aria-hidden>
      {/* Static base gradient — gives the hero its depth without animating. */}
      <div className="m-hero-bg-base" />
      {/* The actual animated network mesh, drawn on canvas. */}
      <NetworkMesh
        color="#a78bfa"
        points={36}
        maxDistance={170}
        dotSize={1.6}
        speed={0.32}
      />
      {/* Bottom fade so the mesh dissolves cleanly into the page below. */}
      <div className="m-hero-bg-fade" />
    </div>
  );
}
