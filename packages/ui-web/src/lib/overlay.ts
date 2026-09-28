import { useEffect, useRef, useState, type RefObject } from "react";

/** True after the first client render — portals need `document.body`. */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

const escapeStack: { current: () => void }[] = [];

function onEscapeKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  const top = escapeStack[escapeStack.length - 1];
  if (!top) return;
  event.preventDefault();
  top.current();
}

/**
 * Calls the latest `handler` on Escape while `active`. Only the most recently
 * activated overlay responds, so Escape on a confirm doesn't also close the
 * sheet beneath it.
 */
export function useEscapeKey(active: boolean, handler: () => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!active) return;
    const entry = handlerRef;
    if (escapeStack.length === 0) document.addEventListener("keydown", onEscapeKeyDown);
    escapeStack.push(entry);
    return () => {
      const index = escapeStack.lastIndexOf(entry);
      if (index >= 0) escapeStack.splice(index, 1);
      if (escapeStack.length === 0) document.removeEventListener("keydown", onEscapeKeyDown);
    };
  }, [active]);
}

let scrollLocks = 0;
let previousOverflow = "";

/** Ref-counted so stacked overlays (sheet + confirm) restore the original overflow once. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    if (scrollLocks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}

/** Moves focus into `ref` when opened and restores it to the previous element on close. */
export function useFocusReturn(active: boolean, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const el = ref.current;
      if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      previous?.focus?.({ preventScroll: true });
    };
  }, [active, ref]);
}
