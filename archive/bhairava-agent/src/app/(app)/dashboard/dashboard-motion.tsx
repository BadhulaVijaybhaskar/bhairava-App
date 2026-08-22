"use client";

import { FadeIn } from "@/components/motion/fade-in";

export function DashboardMotion({ children }: { children: React.ReactNode }) {
  return <FadeIn y={8}>{children}</FadeIn>;
}
