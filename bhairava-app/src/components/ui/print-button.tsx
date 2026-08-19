"use client";

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn-primary w-full py-2.5" onClick={() => window.print()}>
      {label}
    </button>
  );
}
