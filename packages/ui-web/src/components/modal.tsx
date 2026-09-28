import { X } from "lucide-react";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOccupyCreateFab } from "../lib/fab-visibility";
import { useBodyScrollLock, useEscapeKey, useFocusReturn, useMounted } from "../lib/overlay";
import { cn } from "../lib/utils";

export type ModalSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

/**
 * Centered dialog (bottom-anchored on small screens) over a blurred backdrop.
 * Sits above drawers so confirmations can stack on an open sheet.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = "md",
  className,
  dismissible = true,
  hideClose,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned action row. */
  footer?: ReactNode;
  children?: ReactNode;
  size?: ModalSize;
  className?: string;
  /** When false, Escape and backdrop clicks don't close (e.g. while saving). */
  dismissible?: boolean;
  hideClose?: boolean;
}) {
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const dismiss = () => {
    if (dismissible) onClose();
  };
  useOccupyCreateFab(open);
  useEscapeKey(open, dismiss);
  useBodyScrollLock(open);
  useFocusReturn(open && mounted, panelRef);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      className="fixed inset-0 z-[1200] flex items-end justify-center p-4 sm:items-center"
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        onClick={dismiss}
        className="fade-in absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "glass rise relative flex max-h-[88dvh] w-full flex-col overflow-y-auto rounded-2xl p-5 shadow-float outline-none sm:p-6",
          sizeClasses[size],
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="font-display text-lg font-semibold tracking-[-0.02em]">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="pt-1.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {!hideClose && dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="-mt-1 -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface-c hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {children && <div className={cn(title || description ? "pt-4" : undefined)}>{children}</div>}
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 pt-5">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
