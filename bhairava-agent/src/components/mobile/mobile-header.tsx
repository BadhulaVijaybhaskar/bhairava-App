"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Menu, MoreVertical } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

export function MobileHeader({
  title,
  backHref,
  showMenu = false,
  showBell = true,
  showOverflow = false,
  overflowHref = "/more",
  right,
}: {
  title: string;
  backHref?: string;
  showMenu?: boolean;
  showBell?: boolean;
  showOverflow?: boolean;
  overflowHref?: string;
  right?: React.ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="sticky top-0 z-30 -mx-4 mb-3 flex h-[48px] items-center gap-1 border-b border-border/80 bg-white/90 px-3 backdrop-blur-md"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>
      ) : showMenu ? (
        <Link
          href="/more"
          className="flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
          aria-label="Menu"
        >
          <Menu size={20} />
        </Link>
      ) : (
        <span className="w-9" />
      )}
      <h1 className="min-w-0 flex-1 truncate text-center text-[16px] font-semibold text-foreground">
        {title}
      </h1>
      {right ? (
        right
      ) : showOverflow ? (
        <Link
          href={overflowHref}
          className="flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
          aria-label="More options"
        >
          <MoreVertical size={18} />
        </Link>
      ) : showBell ? (
        <Link
          href="/more"
          className="relative flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </Link>
      ) : (
        <span className="w-9" />
      )}
    </motion.header>
  );
}
