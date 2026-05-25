"use client";

// NetworkMesh — Vanta-NET-style animated point-and-line network on a
// <canvas>. Purpose-built for the hero background:
//   • ~36 points, lines only when point distance < threshold
//   • Throttled to ~30fps (skip every other rAF tick)
//   • Pauses entirely when the canvas leaves the viewport
//   • Pauses when the tab is hidden
//   • Honours prefers-reduced-motion (renders a single static frame)
//   • No filters, no blur, no shadows — pure GPU-friendly canvas paint
//
// Why this instead of the previous CSS aurora + orbs + scanline + SMIL
// orchestrator: animated CSS `filter: blur()` + `hue-rotate` forces the
// browser to repaint full-screen filtered layers every frame, which was
// the root cause of the reported "whole site is hanging" issue. A single
// 2D canvas with ~30 cheap line draws stays at 60fps on a midrange laptop.

import { useEffect, useRef } from "react";

type Props = {
  /** point colour (rgb-ish hex without alpha) */
  color?: string;
  /** background tint colour */
  background?: string;
  /** number of nodes */
  points?: number;
  /** max distance between two points for a connecting line to be drawn (px) */
  maxDistance?: number;
  /** dot radius (px) */
  dotSize?: number;
  /** animation speed multiplier */
  speed?: number;
  /** className for the wrapper */
  className?: string;
};

export function NetworkMesh({
  color = "#a78bfa",
  background = "transparent",
  points = 36,
  maxDistance = 160,
  dotSize = 1.6,
  speed = 0.35,
  className,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;

    function resize() {
      const rect = wrap!.getBoundingClientRect();
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    type Pt = { x: number; y: number; vx: number; vy: number };
    const pts: Pt[] = [];
    const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
    function seed() {
      pts.length = 0;
      for (let i = 0; i < points; i++) {
        pts.push({
          x: rand(0, w),
          y: rand(0, h),
          vx: rand(-speed, speed),
          vy: rand(-speed, speed),
        });
      }
    }
    seed();

    // Parse the hex colour once so we can build rgba strings cheaply.
    function hexToRgb(hex: string): { r: number; g: number; b: number } {
      const h = hex.replace("#", "");
      const v = h.length === 3
        ? h.split("").map((c) => c + c).join("")
        : h;
      const n = parseInt(v, 16);
      return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
    }
    const rgb = hexToRgb(color.startsWith("#") ? color : `#${color}`);
    const rgbStr = `${rgb.r},${rgb.g},${rgb.b}`;
    const maxSq = maxDistance * maxDistance;

    function step() {
      ctx!.clearRect(0, 0, w, h);

      if (background !== "transparent") {
        ctx!.fillStyle = background;
        ctx!.fillRect(0, 0, w, h);
      }

      // Move points and bounce off edges.
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }

      // Draw lines between points within `maxDistance`. Opacity tapers off
      // with distance so far-away connections fade naturally.
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        for (let j = i + 1; j < pts.length; j++) {
          const b = pts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dSq = dx * dx + dy * dy;
          if (dSq > maxSq) continue;
          const alpha = (1 - dSq / maxSq) * 0.55;
          ctx!.strokeStyle = `rgba(${rgbStr},${alpha.toFixed(3)})`;
          ctx!.lineWidth = 0.8;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
      }

      // Draw dots last so they sit on top of lines.
      ctx!.fillStyle = `rgba(${rgbStr},0.85)`;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    // Throttle to ~30fps: skip every other animation frame. That gives us
    // visually smooth motion at half the paint cost.
    let raf = 0;
    let frame = 0;
    let visible = true;
    let docVisible = !document.hidden;
    function loop() {
      if (!visible || !docVisible) {
        raf = 0;
        return;
      }
      frame++;
      if (frame % 2 === 0) step();
      raf = window.requestAnimationFrame(loop);
    }

    if (reduced) {
      // Render a single frame so the canvas isn't blank, then never animate.
      step();
    } else {
      raf = window.requestAnimationFrame(loop);
    }

    // Pause when the hero scrolls offscreen.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visible = e.isIntersecting;
          if (visible && !raf && !reduced) raf = window.requestAnimationFrame(loop);
        }
      },
      { threshold: 0.01 },
    );
    io.observe(wrap);

    function onVis() {
      docVisible = !document.hidden;
      if (docVisible && !raf && !reduced && visible) raf = window.requestAnimationFrame(loop);
    }
    document.addEventListener("visibilitychange", onVis);

    let resizeRaf = 0;
    function onResize() {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        resize();
        seed();
      });
    }
    window.addEventListener("resize", onResize);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
    };
  }, [color, background, points, maxDistance, dotSize, speed]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={className}
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
