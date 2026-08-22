"use client";

import type { ReactNode } from "react";

/** Stops parent row navigation when opening dialer / mail. */
export function ContactAction({
  href,
  className,
  children,
  title,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <a
      href={href}
      title={title}
      className={className}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}
