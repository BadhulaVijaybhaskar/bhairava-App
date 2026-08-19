"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { Mail, Phone, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusItem = {
  key: string;
  stage: string;
  plotNumber: string;
  projectName: string;
  href: string;
  meta?: string;
};

export type StatusChip = {
  key: string;
  label: string;
  count: number;
  pillClass: string;
};

export type DetailRow = {
  key: string;
  label: string;
  value: string;
  href?: string;
};

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      {/* Official-style WhatsApp glyph — solid, no faded corner */}
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.39-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23zM8.53 7.33c-.26-.01-.53.1-.7.3-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56 1.37 2.08 3.2 3.55 5.26 4.26.7.28 1.36.48 1.87.61.81.25 1.55.21 2.14.13.65-.09 2.03-.83 2.32-1.63.28-.8.28-1.49.2-1.63-.09-.15-.33-.23-.7-.41-.36-.17-2.14-1.05-2.47-1.17-.33-.12-.57-.17-.81.18s-.93 1.17-1.14 1.41c-.21.24-.42.27-.78.09-.36-.18-1.51-.56-2.88-1.78-1.07-.95-1.79-2.12-2-2.48-.21-.36-.02-.55.16-.73.17-.17.36-.41.54-.62.18-.2.24-.35.36-.58.12-.24.06-.44-.03-.62-.09-.17-.78-1.91-1.1-2.62-.28-.66-.58-.57-.8-.58z" />
    </svg>
  );
}

function Modal({
  open,
  title,
  titleId,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-[var(--bhairava-deep)]/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 id={titleId} className="text-base font-bold text-foreground">
            {title}
          </h3>
          <button
            type="button"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-canvas"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Phone with call + WhatsApp icons; email with mail icon */
export function CustomerContactLines({
  mobile,
  email,
}: {
  mobile: string;
  email?: string | null;
}) {
  return (
    <div className="mt-0.5 space-y-0.5">
      <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <a
          href={`tel:+91${mobile}`}
          className="shrink-0 text-emerald-600 hover:text-emerald-700"
          title="Call"
          aria-label="Call"
        >
          <Phone className="h-3.5 w-3.5" strokeWidth={2.4} />
        </a>
        <a
          href={`https://wa.me/91${mobile}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-[#25D366] hover:opacity-80"
          title="WhatsApp"
          aria-label="WhatsApp"
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
        <a
          href={`tel:+91${mobile}`}
          className="min-w-0 truncate hover:text-emerald-700"
        >
          {mobile}
        </a>
      </div>
      {email ? (
        <a
          href={`mailto:${email}`}
          className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-sky-700"
        >
          <Mail className="h-3.5 w-3.5 shrink-0 text-sky-600" strokeWidth={2.4} />
          <span className="min-w-0 truncate">{email}</span>
        </a>
      ) : null}
    </div>
  );
}

/** Detail rows + single funnel Status chip */
export function CustomerDetailBlock({
  rows,
  statusChip,
  statusItems,
}: {
  rows: DetailRow[];
  statusChip: StatusChip | null;
  statusItems: StatusItem[];
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-start justify-between gap-4">
            <span className="shrink-0 text-sm text-muted-foreground">{row.label}</span>
            <div className="min-w-0 text-right text-sm font-semibold text-foreground">
              {row.href ? (
                <Link href={row.href} className="hover:text-primary">
                  {row.value}
                </Link>
              ) : (
                <span className="whitespace-pre-wrap font-semibold">{row.value}</span>
              )}
            </div>
          </div>
        ))}

        <div className="flex items-start justify-between gap-4">
          <span className="shrink-0 pt-0.5 text-sm text-muted-foreground">Status</span>
          <div className="min-w-0 text-right">
            {!statusChip ? (
              <span className="text-sm font-medium text-muted-foreground">None yet</span>
            ) : (
              <button
                type="button"
                onClick={() => setStatusOpen(true)}
                className={cn(
                  "status-pill inline-flex items-center gap-1 !cursor-pointer",
                  statusChip.pillClass,
                )}
              >
                {statusChip.label}
                {statusChip.count > 1 ? (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--bhairava-deep)]/15 px-1 text-[10px] font-bold">
                    {statusChip.count}
                  </span>
                ) : null}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border/70" />

      <Modal
        open={statusOpen}
        title={statusChip ? `${statusChip.label} details` : "Status"}
        titleId={titleId}
        onClose={() => setStatusOpen(false)}
      >
        {statusItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No plots at this stage.</p>
        ) : (
          <ul className="space-y-2">
            {statusItems.map((item, idx) => (
              <li key={item.key} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    #{idx + 1}
                  </p>
                  <Link
                    href={item.href}
                    className="text-sm font-bold text-primary hover:underline"
                    onClick={() => setStatusOpen(false)}
                  >
                    {item.plotNumber}
                  </Link>
                  <p className="text-sm text-foreground">{item.projectName}</p>
                  {item.meta ? <p className="text-xs text-muted-foreground">{item.meta}</p> : null}
                </div>
                <Link
                  href={item.href}
                  className="shrink-0 text-xs font-semibold text-primary"
                  onClick={() => setStatusOpen(false)}
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
