"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { DocumentCategory, DocumentEntityType } from "@prisma/client";
import { uploadDocument } from "@/app/admin/documents/actions";

const CATEGORY_OPTS = Object.values(DocumentCategory);
const ENTITY_OPTS: { key: DocumentEntityType; label: string }[] = [
  { key: "ORGANIZATION", label: "Organization" },
  { key: "CUSTOMER", label: "Customer" },
  { key: "PROJECT", label: "Project" },
  { key: "PLOT", label: "Plot" },
  { key: "BOOKING", label: "Booking" },
];

export function DocumentUploadForm({
  customers,
  projects,
  plots,
  bookings,
  defaultCustomerId,
  defaultTitle,
}: {
  customers: { id: string; fullName: string }[];
  projects: { id: string; name: string }[];
  plots: { id: string; plotNumber: string; projectId: string }[];
  bookings: { id: string; bookingNumber: string }[];
  defaultCustomerId?: string;
  defaultTitle?: string;
}) {
  const [open, setOpen] = useState(Boolean(defaultCustomerId || defaultTitle));
  const [entityType, setEntityType] = useState<DocumentEntityType>(
    defaultCustomerId ? "CUSTOMER" : "ORGANIZATION",
  );

  if (!open) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-primary px-3.5 py-2"
        >
          <Upload className="h-4 w-4" />
          Upload document
        </button>
      </div>
    );
  }

  return (
    <form action={uploadDocument} encType="multipart/form-data" className="surface space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Upload document</p>
        <button
          type="button"
          className="text-xs font-semibold text-muted-foreground hover:text-primary"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-foreground sm:col-span-2">
          Title
          <input
            name="title"
            required
            defaultValue={defaultTitle ?? ""}
            className="input-field mt-1 !pl-3"
            placeholder="Sale deed / PAN / Brochure…"
          />
        </label>

        <label className="block text-sm font-semibold text-foreground">
          Category
          <select name="category" className="input-field mt-1 !pl-3" defaultValue="OTHER">
            {CATEGORY_OPTS.map((c) => (
              <option key={c} value={c}>
                {c.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-semibold text-foreground">
          Linked to
          <select
            name="entityType"
            className="input-field mt-1 !pl-3"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as DocumentEntityType)}
          >
            {ENTITY_OPTS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        {entityType === "CUSTOMER" ? (
          <label className="block text-sm font-semibold text-foreground sm:col-span-2">
            Customer
            <select
              name="entityId"
              required
              className="input-field mt-1 !pl-3"
              defaultValue={defaultCustomerId ?? ""}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {entityType === "PROJECT" ? (
          <label className="block text-sm font-semibold text-foreground sm:col-span-2">
            Project
            <select name="entityId" required className="input-field mt-1 !pl-3" defaultValue="">
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {entityType === "PLOT" ? (
          <label className="block text-sm font-semibold text-foreground sm:col-span-2">
            Plot
            <select name="entityId" required className="input-field mt-1 !pl-3" defaultValue="">
              <option value="">Select plot</option>
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.plotNumber}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {entityType === "BOOKING" ? (
          <label className="block text-sm font-semibold text-foreground sm:col-span-2">
            Booking
            <select name="entityId" required className="input-field mt-1 !pl-3" defaultValue="">
              <option value="">Select booking</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bookingNumber}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {entityType === "ORGANIZATION" ? (
          <input type="hidden" name="entityId" value="" />
        ) : null}

        <label className="block text-sm font-semibold text-foreground sm:col-span-2">
          File (PDF, image, Office — max 20 MB)
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            className="mt-1 block w-full text-sm"
          />
        </label>
      </div>

      <button type="submit" className="btn-primary px-4 py-2.5">
        <Upload className="h-4 w-4" />
        Save upload
      </button>
    </form>
  );
}
