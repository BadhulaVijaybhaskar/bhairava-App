"use client";

import { ListSearchBar, type ListFilterGroup } from "@/components/ui";

export function ProjectSearchBar({
  initialQ = "",
  filterGroups,
}: {
  initialQ?: string;
  filterGroups: ListFilterGroup[];
}) {
  return (
    <ListSearchBar
      basePath="/admin/projects"
      placeholder="Search projects"
      initialQ={initialQ}
      filterGroups={filterGroups}
    />
  );
}
