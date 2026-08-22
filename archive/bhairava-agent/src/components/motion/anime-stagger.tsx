"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "motion/react";

/** Imperative stagger reveal for list cards (Anime.js). */
export function AnimeStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || !ref.current) return;
    const items = ref.current.querySelectorAll("[data-anime-item]");
    if (!items.length) return;
    const anim = animate(items, {
      opacity: [0, 1],
      y: [10, 0],
      duration: 420,
      delay: stagger(45),
      ease: "out(3)",
    });
    return () => {
      anim.pause();
    };
  }, [reduce, children]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
