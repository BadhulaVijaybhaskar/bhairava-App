"use client";

import { useState, useTransition } from "react";
import { expressInterest } from "./actions";

export function InterestButton({
  plotId,
  disabled,
}: {
  plotId: string;
  disabled?: boolean;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || pending || done}
        className="btn-primary px-3 py-1.5 text-xs disabled:opacity-50"
        onClick={() => {
          setError("");
          start(async () => {
            const res = await expressInterest(plotId);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            setDone(true);
          });
        }}
      >
        {done ? "Interested" : pending ? "Saving…" : "Interest"}
      </button>
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </div>
  );
}
