"use client";

import { useEffect, useRef } from "react";
import { animate, stagger } from "animejs";
import { useReducedMotion } from "motion/react";

/** Imperative stagger reveal for list rows/cards (Anime.js). */
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
      y: [8, 0],
      duration: 380,
      delay: stagger(40),
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
