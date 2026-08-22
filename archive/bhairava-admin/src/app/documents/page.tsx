"use client";
import { useMemo, useState } from "react";
import { FileText, FileCheck2, FileClock, FileX2, FileStack, ReceiptText, ScrollText, Upload } from "lucide-react";
import { PageHeader, FilterBar, Metric, Chip, DataTable, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { documents, customers, projects, plots, byId, type DocumentRecord } from "@/lib/mock-data";

const typeIcon: Record<DocumentRecord["type"], typeof FileText> = {
  Agreement: FileText,
  "Sale deed": ScrollText,
  KYC: FileStack,
  Receipt: ReceiptText,
  "Layout approval": FileCheck2,
  NOC: FileClock,
};

const views = ["All", "Agreement", "Sale deed", "KYC", "Receipt", "Layout approval", "NOC", "Pending", "Rejected"];

export default function DocumentsPage() {
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (active === "Pending" && d.verified !== "Pending") return false;
      else if (active === "Rejected" && d.verified !== "Rejected") return false;
      else if (!["All", "Pending", "Rejected"].includes(active) && d.type !== active) return false;
      const customer = byId(customers, d.customerId);
      const project = byId(projects, d.projectId);
      if (
        query &&
        !`${d.name} ${customer?.name ?? ""} ${project?.name ?? ""} ${d.plotId}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [active, query]);

  const pending = documents.filter((d) => d.verified === "Pending").length;
  const rejected = documents.filter((d) => d.verified === "Rejected").length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales · Documentation"
        title="Documents Centre"
        description="Every agreement, KYC record and approval, tracked to verification."
        actions={
          <Btn variant="primary">
            <Upload className="h-4 w-4" /> Upload document
          </Btn>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Total documents" value={String(documents.length)} hint="across all projects" />
        <Metric label="Pending verification" value={String(pending)} hint="awaiting review" />
        <Metric label="Rejected" value={String(rejected)} hint="needs resubmission" />
      </div>

      <div className="pt-6">
        <FilterBar views={views} active={active} onSelect={setActive} query={query} onQuery={setQuery} placeholder="Search documents…" />

        <DataTable
          rows={filtered}
          columns={[
            {
              key: "name",
              header: "Document",
              cell: (d) => {
                const Icon = typeIcon[d.type];
                return (
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-c">
                      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                    </span>
                    <span className="truncate text-sm font-medium">{d.name}</span>
                  </div>
                );
              },
            },
            { key: "type", header: "Type", cell: (d) => <Chip tone="info">{d.type}</Chip> },
            { key: "customer", header: "Customer", cell: (d) => <span className="text-sm">{byId(customers, d.customerId)?.name ?? "—"}</span> },
            { key: "project", header: "Project", cell: (d) => <span className="text-sm text-muted-foreground">{byId(projects, d.projectId)?.code ?? "—"}</span> },
            { key: "plot", header: "Plot", cell: (d) => <span className="numeric text-sm">{byId(plots, d.plotId)?.number ?? d.plotId}</span> },
            { key: "verified", header: "Verification", cell: (d) => <Chip>{d.verified}</Chip> },
            { key: "modified", header: "Modified", cell: (d) => <span className="numeric text-xs text-muted-foreground">{d.modified}</span> },
            { key: "size", header: "Size", align: "right", cell: (d) => <span className="numeric text-xs text-muted-foreground">{(d.sizeKb / 1024).toFixed(1)} MB</span> },
          ]}
        />
      </div>
    </AppShell>
  );
}
