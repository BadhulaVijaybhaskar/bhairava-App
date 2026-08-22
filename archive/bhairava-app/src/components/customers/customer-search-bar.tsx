"use client";

import { ListSearchBar, type ListFilterOption } from "@/components/ui";

const FILTERS: ListFilterOption[] = [
  { key: "", label: "All statuses" },
  { key: "Interest", label: "Interest" },
  { key: "Booked", label: "Booked" },
  { key: "Registered", label: "Registered" },
  { key: "Resale", label: "Resale" },
];

export function CustomerSearchBar({
  initialQ = "",
  initialFilter = "",
}: {
  initialQ?: string;
  initialFilter?: string;
}) {
  return (
    <ListSearchBar
      basePath="/admin/customers"
      placeholder="Search customers"
      initialQ={initialQ}
      initialFilter={initialFilter}
      filters={FILTERS}
    />
  );
}
