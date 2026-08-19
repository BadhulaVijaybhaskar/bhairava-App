"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Plus, Upload } from "lucide-react";
import {
  addCustomerDocumentSection,
  removeCustomerDocumentSection,
} from "@/app/admin/customers/actions";
import { cn } from "@/lib/utils";
import type { DocChecklistItem } from "@/lib/customer-funnel";

export function CustomerDocumentsSection({
  customerId,
  checklist,
  uploadedTitles,
}: {
  customerId: string;
  checklist: DocChecklistItem[];
  uploadedTitles: string[];
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const uploaded = new Set(uploadedTitles.map((t) => t.toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground">Documents</h3>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
          Add section
        </button>
      </div>

      <ul className="space-y-0">
        {checklist.map((row) => {
          const isUp = uploaded.has(row.title.toLowerCase());
          return (
            <li key={row.id} className="group flex items-center gap-2">
              <Link
                href="/admin/documents"
                className="flex min-w-0 flex-1 items-center gap-3 py-2.5 transition hover:bg-canvas/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-low)] text-muted-foreground">
                  <FileText className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                  {row.title}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium",
                    isUp ? "text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  {isUp ? "Uploaded" : "Pending"}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
              <form
                action={removeCustomerDocumentSection}
                className="shrink-0 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100"
              >
                <input type="hidden" name="customerId" value={customerId} />
                <input type="hidden" name="sectionId" value={row.id} />
                <button
                  type="submit"
                  className="px-1 text-[10px] font-semibold text-red-600 hover:underline"
                  title="Remove section"
                >
                  Remove
                </button>
              </form>
            </li>
          );
        })}
      </ul>

      {/* Add new section under existing list */}
      {adding ? (
        <form action={addCustomerDocumentSection} className="flex gap-2 pt-1">
          <input type="hidden" name="customerId" value={customerId} />
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={80}
            placeholder="Document name (e.g. Sale deed)"
            className="input-field min-w-0 flex-1"
            autoFocus
          />
          <button type="submit" className="btn-primary shrink-0 px-3 py-2 text-sm">
            Add
          </button>
          <button
            type="button"
            className="btn-secondary shrink-0 px-3 py-2 text-sm"
            onClick={() => {
              setAdding(false);
              setTitle("");
            }}
          >
            Cancel
          </button>
        </form>
      ) : null}

      <Link
        href={`/admin/documents?customerId=${customerId}`}
        className="btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm"
      >
        <Upload className="h-4 w-4" strokeWidth={2.4} />
        Upload Document
      </Link>
    </div>
  );
}
