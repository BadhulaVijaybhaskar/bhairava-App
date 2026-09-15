import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  FileText,
  FileCheck2,
  FileClock,
  FileStack,
  ReceiptText,
  ScrollText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, FilterBar, Metric, Chip, DataTable, Btn } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { byId, type DocumentRecord } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { downloadCsv } from "@/lib/csv";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents Centre — Bhairava" },
      {
        name: "description",
        content:
          "Search, verify and manage every agreement, deed and KYC document across projects.",
      },
      { property: "og:title", content: "Documents Centre — Bhairava" },
      {
        property: "og:description",
        content:
          "Search, verify and manage every agreement, deed and KYC document across projects.",
      },
    ],
  }),
  component: DocumentsPage,
});

const typeIcon: Record<DocumentRecord["type"], typeof FileText> = {
  Agreement: FileText,
  "Sale deed": ScrollText,
  KYC: FileStack,
  Receipt: ReceiptText,
  "Layout approval": FileCheck2,
  NOC: FileClock,
};

const views = [
  "All",
  "Agreement",
  "Sale deed",
  "KYC",
  "Receipt",
  "Layout approval",
  "NOC",
  "Pending",
  "Rejected",
];

function DocumentsPage() {
  const { documents, customers, projects, plots, saveDocument, nextId } = useData();
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
  }, [active, query, documents, customers, projects]);

  const pending = documents.filter((d) => d.verified === "Pending").length;
  const rejected = documents.filter((d) => d.verified === "Rejected").length;

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    const bookingCustomer = customers[0];
    const project = projects[0];
    const plot = plots.find((p) => p.projectId === project?.id) ?? plots[0];
    if (!bookingCustomer || !project || !plot) {
      toast.error("Add a customer and project before uploading documents.");
      return;
    }
    const doc: DocumentRecord = {
      id: nextId("DOC-", documents),
      name: file.name,
      type: "KYC",
      customerId: bookingCustomer.id,
      projectId: project.id,
      plotId: plot.id,
      verified: "Pending",
      modified: new Date().toISOString().slice(0, 10),
      sizeKb: Math.max(1, Math.round(file.size / 1024)),
    };
    saveDocument(doc);
    toast.success(`Uploaded ${file.name}`);
  };

  const setVerified = (d: DocumentRecord, verified: DocumentRecord["verified"]) => {
    saveDocument({ ...d, verified, modified: new Date().toISOString().slice(0, 10) });
    toast.success(`Marked ${d.name} as ${verified}`);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales · Documentation"
        title="Documents Centre"
        description="Every agreement, KYC record and approval, tracked to verification."
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={(e) => {
                onUpload(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Btn variant="primary" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload document
            </Btn>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric
          label="Total documents"
          value={String(documents.length)}
          hint="across all projects"
        />
        <Metric label="Pending verification" value={String(pending)} hint="awaiting review" />
        <Metric label="Rejected" value={String(rejected)} hint="needs resubmission" />
      </div>

      <div className="pt-6">
        <FilterBar
          views={views}
          active={active}
          onSelect={setActive}
          query={query}
          onQuery={setQuery}
          placeholder="Search documents…"
          onFilters={() => toast.message("Use the type tabs to filter documents.")}
          onExport={() => {
            downloadCsv(
              `bhairava-documents-${new Date().toISOString().slice(0, 10)}.csv`,
              ["ID", "Name", "Type", "Customer", "Project", "Plot", "Verified", "Modified"],
              filtered.map((d) => [
                d.id,
                d.name,
                d.type,
                byId(customers, d.customerId)?.name ?? "",
                byId(projects, d.projectId)?.code ?? "",
                byId(plots, d.plotId)?.number ?? d.plotId,
                d.verified,
                d.modified,
              ]),
            );
            toast.success(`Exported ${filtered.length} documents`);
          }}
        />

        <DataTable
          rows={filtered}
          columns={[
            {
              key: "name",
              header: "Document",
              cell: (d) => {
                const Icon = typeIcon[d.type];
                return (
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-c">
                      <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.8} />
                    </span>
                    <span className="truncate text-sm font-medium">{d.name}</span>
                  </div>
                );
              },
            },
            { key: "type", header: "Type", cell: (d) => <Chip tone="info">{d.type}</Chip> },
            {
              key: "customer",
              header: "Customer",
              cell: (d) => (
                <span className="text-sm">{byId(customers, d.customerId)?.name ?? "—"}</span>
              ),
            },
            {
              key: "project",
              header: "Project",
              cell: (d) => (
                <span className="text-sm text-muted-foreground">
                  {byId(projects, d.projectId)?.code ?? "—"}
                </span>
              ),
            },
            {
              key: "plot",
              header: "Plot",
              cell: (d) => (
                <span className="numeric text-sm">{byId(plots, d.plotId)?.number ?? d.plotId}</span>
              ),
            },
            {
              key: "verified",
              header: "Verification",
              cell: (d) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="rounded-md">
                      <Chip>{d.verified}</Chip>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {(["Verified", "Pending", "Rejected"] as const).map((v) => (
                      <DropdownMenuItem key={v} onClick={() => setVerified(d, v)}>
                        Mark {v}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ),
            },
            {
              key: "modified",
              header: "Modified",
              cell: (d) => (
                <span className="numeric text-xs text-muted-foreground">{d.modified}</span>
              ),
            },
            {
              key: "size",
              header: "Size",
              align: "right",
              cell: (d) => (
                <span className="numeric text-xs text-muted-foreground">
                  {(d.sizeKb / 1024).toFixed(1)} MB
                </span>
              ),
            },
          ]}
        />
      </div>
    </AppShell>
  );
}
