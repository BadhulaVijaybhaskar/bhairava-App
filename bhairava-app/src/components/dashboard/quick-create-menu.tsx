"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CalendarCheck2, Plus, UserPlus, Handshake } from "lucide-react";

const actions = [
  { href: "/admin/bookings/new", label: "New booking", icon: CalendarCheck2 },
  { href: "/admin/agents/new", label: "New agent", icon: Handshake },
  { href: "/admin/customers/new", label: "New customer", icon: UserPlus },
];

export function QuickCreateMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !buttonRef.current) return;

    function placeMenu() {
      const rect = buttonRef.current!.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }

    placeMenu();
    window.addEventListener("resize", placeMenu);
    window.addEventListener("scroll", placeMenu, true);
    return () => {
      window.removeEventListener("resize", placeMenu);
      window.removeEventListener("scroll", placeMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: menuPos.top, right: menuPos.right }}
            className="fixed z-[100] w-52 overflow-hidden rounded-2xl border border-border/80 bg-white py-1.5 shadow-[0_18px_40px_-16px_rgba(7,42,102,0.5)]"
          >
            {actions.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-[var(--surface-low)] hover:text-primary"
                >
                  <Icon className="h-4 w-4 shrink-0 text-primary" />
                  {item.label}
                </Link>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Create new"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 border-primary text-primary transition hover:bg-[var(--surface-low)]"
      >
        <Plus className="h-7 w-7" strokeWidth={2.75} />
      </button>
      {menu}
    </>
  );
}
