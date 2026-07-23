"use client";

import { useCallback, useRef } from "react";

/**
 * TiltCard — pointer-tracking 3D card with moving glare.
 * Dependency-free. Respects prefers-reduced-motion.
 */
export function TiltCard({
  children,
  className = "",
  maxTilt = 9,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef<number | null>(null);

  const reduced = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (reduced() || e.pointerType === "touch") return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0..1
      const py = (e.clientY - rect.top) / rect.height;
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(0.5 - py) * maxTilt}deg`);
        el.style.setProperty("--ry", `${(px - 0.5) * maxTilt}deg`);
        el.style.setProperty("--gx", `${px * 100}%`);
        el.style.setProperty("--gy", `${py * 100}%`);
        el.style.setProperty("--glare", "1");
      });
    },
    [maxTilt],
  );

  const onLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--glare", "0");
  }, []);

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <div className="tilt-inner">{children}</div>
      <div className="tilt-glare" aria-hidden="true" />
    </div>
  );
}
