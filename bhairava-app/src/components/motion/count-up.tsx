"use client";

import { useEffect, useRef } from "react";
import { animate } from "animejs";
import { useReducedMotion } from "motion/react";

/** Anime.js number count-up for KPI values. */
export function CountUp({
  value,
  duration = 900,
  className,
  format = (n) => Math.round(n).toLocaleString("en-IN"),
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!ref.current) return;
    if (reduce) {
      ref.current.textContent = format(value);
      return;
    }
    const proxy = { n: 0 };
    const anim = animate(proxy, {
      n: value,
      duration,
      ease: "out(3)",
      onUpdate: () => {
        if (ref.current) ref.current.textContent = format(proxy.n);
      },
    });
    return () => {
      anim.pause();
    };
  }, [value, duration, format, reduce]);

  return (
    <span ref={ref} className={className}>
      {format(reduce ? value : 0)}
    </span>
  );
}
