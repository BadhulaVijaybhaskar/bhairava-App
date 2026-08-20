import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, FilterBar, Chip, DataTable, NewRecordButton } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { byId, formatINR, type Customer } from "@/lib/mock-data";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — Bhairava" },
      {
        name: "description",
        content: "Search and manage every customer relationship across Bhairava projects.",
      },
      { property: "og:title", content: "Customers — Bhairava" },
      {
        property: "og:description",
        content: "Search and manage every customer relationship across Bhairava projects.",
      },
    ],
  }),
  component: CustomersIndex,
});

const views = ["All", "Lead", "Site visit", "Reserved", "Booked", "Registered"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CustomersIndex() {
  const { customers, agents } = useData();
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      if (active !== "All" && c.stage !== active) return false;
      if (
        query &&
        !`${c.name} ${c.email} ${c.phone} ${c.city} ${c.source}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });
  }, [customers, active, query]);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        description="Every lead and buyer across the pipeline, from first touch to registration."
        actions={
          <>
            <NewRecordButton to="/onboarding/customer">New customer</NewRecordButton>
            <NewRecordButton to="/onboarding/visit">Book visit</NewRecordButton>
          </>
        }
      />

      <FilterBar
        views={views}
        active={active}
        onSelect={setActive}
        query={query}
        onQuery={setQuery}
        placeholder="Search customers…"
        right={
          <span className="numeric px-2 text-xs text-muted-foreground">
            {filtered.length} of {customers.length}
          </span>
        }
      />

      <DataTable<Customer>
        rows={filtered}
        linkTo="/customers/$customerId"
        params={(c) => ({ customerId: c.id })}
        columns={[
          {
            key: "name",
            header: "Customer",
            cell: (c) => (
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold text-foreground">
                  {initials(c.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: "phone",
            header: "Phone",
            cell: (c) => <span className="numeric text-xs">{c.phone}</span>,
          },
          {
            key: "city",
            header: "City",
            cell: (c) => <span className="text-xs text-muted-foreground">{c.city}</span>,
          },
          {
            key: "source",
            header: "Source",
            cell: (c) => <span className="text-xs text-muted-foreground">{c.source}</span>,
          },
          { key: "stage", header: "Stage", cell: (c) => <Chip>{c.stage}</Chip> },
          {
            key: "agent",
            header: "Agent",
            cell: (c) => (
              <span className="text-xs text-muted-foreground">
                {byId(agents, c.agentId)?.name ?? "—"}
              </span>
            ),
          },
          {
            key: "plots",
            header: "Plots",
            align: "right",
            cell: (c) => <span className="numeric text-xs">{c.plots.length}</span>,
          },
          {
            key: "value",
            header: "Value / Paid",
            align: "right",
            cell: (c) => (
              <div className="text-right">
                <p className="numeric text-xs font-medium">
                  {formatINR(c.totalValue, { compact: true })}
                </p>
                <p className="numeric text-[11px] text-muted-foreground">
                  {formatINR(c.paid, { compact: true })} paid
                </p>
              </div>
            ),
          },
        ]}
      />
    </AppShell>
  );
}
