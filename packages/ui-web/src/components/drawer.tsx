import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOccupyCreateFab } from "../lib/fab-visibility";
import { useBodyScrollLock, useEscapeKey, useFocusReturn, useMounted } from "../lib/overlay";
import { cn } from "../lib/utils";

export type DrawerSide = "right" | "left" | "bottom";

const sideClasses: Record<DrawerSide, { wrap: string; panel: string }> = {
  right: {
    wrap: "justify-end",
    panel: "slide-in-right h-full w-full max-w-lg",
  },
  left: {
    wrap: "justify-start",
    panel: "slide-in-left h-full w-full max-w-sm",
  },
  bottom: {
    wrap: "items-end",
    panel: "slide-in-bottom max-h-[88dvh] w-full rounded-t-3xl pb-[env(safe-area-inset-bottom)]",
  },
};

/**
 * Fixed side panel over a blurred backdrop. Closes on Escape or backdrop click,
 * locks body scroll and hides the mobile create (+) while open.
 */
export function Drawer({
  open,
  onClose,
  title,
  eyebrow,
  description,
  side = "right",
  footer,
  children,
  className,
  closeLabel = "Close panel",
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  side?: DrawerSide;
  /** Sticky footer (actions). */
  footer?: ReactNode;
  children: ReactNode;
  /** Extra classes for the panel (e.g. `max-w-2xl`). */
  className?: string;
  closeLabel?: string;
  hideClose?: boolean;
}) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useOccupyCreateFab(open);
  useEscapeKey(open, onClose);
  useBodyScrollLock(open);
  useFocusReturn(open && mounted, panelRef);

  if (!open || !mounted) return null;
  const s = sideClasses[side];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      className={cn("fixed inset-0 z-[1100] flex", s.wrap)}
    >
      <button
        type="button"
        aria-label={closeLabel}
        tabIndex={-1}
        onClick={onClose}
        className="fade-in absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "glass relative flex flex-col overflow-y-auto p-5 shadow-float outline-none sm:p-7",
          s.panel,
          className,
        )}
      >
        {(title || eyebrow || !hideClose) && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow && (
                <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  <span aria-hidden className="gradient-gold h-3 w-px rounded-full" />
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2
                  id={titleId}
                  className={cn(
                    "font-display text-xl font-semibold tracking-[-0.02em]",
                    eyebrow && "pt-2",
                  )}
                >
                  {title}
                </h2>
              )}
              {description && <p className="pt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {!hideClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-c text-muted-foreground transition-colors hover:bg-surface-high hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {(title || eyebrow) && (
          <span aria-hidden className="hairline-gold mt-4 mb-6 block h-px w-full shrink-0 opacity-70" />
        )}

        <div className="flex-1">{children}</div>

        {footer && (
          <div className="glass sticky bottom-0 -mx-5 mt-8 flex items-center justify-between gap-3 rounded-t-2xl px-5 pt-4 pb-2 sm:-mx-7 sm:px-7">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
