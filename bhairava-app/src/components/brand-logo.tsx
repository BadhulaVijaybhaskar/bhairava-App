"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  size?: number;
  spin?: boolean;
  className?: string;
  withPlate?: boolean;
  /** Marks this as the landing spot for the boot splash fly-in */
  isTarget?: boolean;
};

export function BrandLogo({
  size = 72,
  spin = false,
  className,
  withPlate = false,
  isTarget = false,
}: BrandLogoProps) {
  return (
    <div
      data-brand-logo-target={isTarget ? "true" : undefined}
      className={cn(
        "mx-auto flex items-center justify-center brand-logo-slot",
        withPlate && "rounded-2xl bg-[var(--surface-low)]/60 p-2",
        className,
      )}
      style={{ width: size, height: size, perspective: 900 }}
    >
      <div className={cn("relative h-full w-full", spin && "logo-spin-y")}>
        <Image
          src="/branding/bhairava-logo.png"
          alt="Bhairava Real Estate"
          width={size}
          height={size}
          className="h-full w-full object-contain drop-shadow-md"
          priority
        />
      </div>
    </div>
  );
}
