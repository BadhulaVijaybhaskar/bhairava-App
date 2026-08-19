"use client";

import { useRef } from "react";
import { FileText } from "lucide-react";
import { uploadAgentDocument } from "@/app/(app)/documents/actions";

export function DocumentRow({
  title,
  meta,
  action,
  viewHref,
  upload,
}: {
  title: string;
  meta: string;
  action: "view" | "upload" | "na";
  viewHref?: string | null;
  upload?: {
    title: string;
    category: string;
    customerId: string;
    plotId?: string | null;
    bookingId?: string | null;
    projectId?: string | null;
    returnTo: string;
  } | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="list-row">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]">
        <FileText size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--ink)]">{title}</p>
        <p className="text-[11px] text-muted-foreground">{meta}</p>
      </div>
      {action === "view" && viewHref ? (
        <a
          href={viewHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-semibold text-[var(--brand)]"
        >
          View
        </a>
      ) : null}
      {action === "upload" && upload ? (
        <form action={uploadAgentDocument}>
          <input type="hidden" name="title" value={upload.title} />
          <input type="hidden" name="category" value={upload.category} />
          <input type="hidden" name="customerId" value={upload.customerId} />
          {upload.plotId ? <input type="hidden" name="plotId" value={upload.plotId} /> : null}
          {upload.bookingId ? (
            <input type="hidden" name="bookingId" value={upload.bookingId} />
          ) : null}
          {upload.projectId ? (
            <input type="hidden" name="projectId" value={upload.projectId} />
          ) : null}
          <input type="hidden" name="returnTo" value={upload.returnTo} />
          <input
            ref={inputRef}
            type="file"
            name="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => {
              if (e.target.files?.[0]) e.currentTarget.form?.requestSubmit();
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[12px] font-semibold text-[var(--danger)]"
          >
            Upload
          </button>
        </form>
      ) : null}
      {action === "na" ? (
        <span className="text-[11px] font-medium text-[var(--muted-soft)]">Not Available</span>
      ) : null}
    </div>
  );
}
