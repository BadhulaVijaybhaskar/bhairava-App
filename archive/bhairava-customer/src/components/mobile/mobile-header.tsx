import Link from "next/link";
import { ArrowLeft, Bell } from "lucide-react";

export function MobileHeader({
  title,
  backHref,
  showBell = true,
  right,
  subtitle,
}: {
  title: string;
  backHref?: string;
  showBell?: boolean;
  right?: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <header
      className="sticky top-0 z-30 -mx-4 mb-3 flex h-[52px] items-center gap-2 border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink)]"
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>
      ) : (
        <span className="w-9" />
      )}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-[16px] font-semibold leading-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? <p className="truncate text-[11px] text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {right ? (
        right
      ) : showBell ? (
        <Link
          href="/more"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--ink)]"
          aria-label="Notifications"
        >
          <Bell size={18} strokeWidth={2.1} />
        </Link>
      ) : (
        <span className="w-9" />
      )}
    </header>
  );
}
