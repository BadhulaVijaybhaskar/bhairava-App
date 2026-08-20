import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Columns3 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, FilterBar, NewRecordButton, PageHeader, Panel } from "@/components/kit";
import { statusLabel } from "@/components/plot-canvas";
import { byId, formatINR, type Plot, type PlotStatus } from "@/lib/mock-data";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/plots/")({
  head: () => ({
    meta: [
      { title: "Plot Inventory — Bhairava" },
      {
        name: "description",
        content: "Spreadsheet-grade plot inventory list with saved views, filters, sorting and inline price edits.",
      },
      { property: "og:title", content: "Plot Inventory — Bhairava" },
      { property: "og:description", content: "Spreadsheet-grade plot inventory list across every project." },
    ],
  }),
  component: PlotsIndexPage,
});

const VIEWS = ["All", "Available", "Reserved", "Booked", "Registered", "Resale"] as const;
type View = (typeof VIEWS)[number];

type ColumnKey =
  | "number"
  | "project"
  | "area"
  | "facing"
  | "price"
  | "total"
  | "status"
  | "customer"
  | "agent";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  number: "Plot no",
  project: "Project",
  area: "Area",
  facing: "Facing",
  price: "Price/sq.yd",
  total: "Total value",
  status: "Status",
  customer: "Customer",
  agent: "Agent",
};

function PlotsIndexPage() {
  const { plots, projects, customers, agents } = useData();
  const [view, setView] = useState<View>("All");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<ColumnKey>("number");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showColsPicker, setShowColsPicker] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<ColumnKey, boolean>>({
    number: true,
    project: true,
    area: true,
    facing: true,
    price: true,
    total: true,
    status: true,
    customer: true,
    agent: true,
  });
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});

  const rows = useMemo(() => {
    let list: Plot[] = plots;
    if (view !== "All") {
      const s = view.toLowerCase() as PlotStatus;
      list = list.filter((p) => p.status === s);
    }
    if (projectFilter !== "all") list = list.filter((p) => p.projectId === projectFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => {
        const cust = p.customerId ? byId(customers, p.customerId)?.name ?? "" : "";
        const agent = p.agentId ? byId(agents, p.agentId)?.name ?? "" : "";
        return (
          p.number.toLowerCase().includes(q) ||
          cust.toLowerCase().includes(q) ||
          agent.toLowerCase().includes(q)
        );
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    const withMeta = list.map((p) => ({
      p,
      project: byId(projects, p.projectId)?.name ?? "",
      customer: p.customerId ? byId(customers, p.customerId)?.name ?? "" : "",
      agent: p.agentId ? byId(agents, p.agentId)?.name ?? "" : "",
      price: priceOverrides[p.id] ?? p.pricePerSqYd,
    }));

    withMeta.sort((a, b) => {
      switch (sortKey) {
        case "number":
          return a.p.number.localeCompare(b.p.number) * dir;
        case "project":
          return a.project.localeCompare(b.project) * dir;
        case "area":
          return (a.p.areaSqYd - b.p.areaSqYd) * dir;
        case "facing":
          return a.p.facing.localeCompare(b.p.facing) * dir;
        case "price":
          return (a.price - b.price) * dir;
        case "total":
          return (a.price * a.p.areaSqYd - b.price * b.p.areaSqYd) * dir;
        case "status":
          return a.p.status.localeCompare(b.p.status) * dir;
        case "customer":
          return a.customer.localeCompare(b.customer) * dir;
        case "agent":
          return a.agent.localeCompare(b.agent) * dir;
        default:
          return 0;
      }
    });

    return withMeta;
  }, [plots, projects, customers, agents, view, projectFilter, query, sortKey, sortDir, priceOverrides]);

  const toggleSort = (key: ColumnKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortHeader = ({ col }: { col: ColumnKey }) => (
    <button
      onClick={() => toggleSort(col)}
      className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase hover:text-foreground"
    >
      {COLUMN_LABELS[col]}
      {sortKey === col &&
        (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inventory"
        title="Plot Inventory"
        description="Every plot across every project, with live pricing, status and ownership."
        actions={<NewRecordButton to="/onboarding/plot">New plot</NewRecordButton>}
      />

      <div className="flex flex-wrap items-center gap-2 pb-3">
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => setProjectFilter((v) => (v === p.id ? "all" : p.id))}
            className={
              "rounded-full px-3 py-1 text-xs font-medium transition-colors " +
              (projectFilter === p.id
                ? "bg-primary/12 text-primary"
                : "bg-surface-c text-muted-foreground hover:bg-surface-high")
            }
          >
            {p.code}
          </button>
        ))}
      </div>

      <FilterBar
        views={[...VIEWS]}
        active={view}
        onSelect={(v) => setView(v as View)}
        query={query}
        onQuery={setQuery}
        placeholder="Search plot, customer, agent…"
        right={
          <div className="relative">
            <button
              onClick={() => setShowColsPicker((v) => !v)}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-surface-low px-2.5 text-xs text-muted-foreground"
            >
              <Columns3 className="h-3.5 w-3.5" /> Columns
            </button>
            {showColsPicker && (
              <Panel tonal className="absolute top-9 right-0 z-20 w-48 p-3">
                <div className="flex flex-col gap-1.5">
                  {(Object.keys(COLUMN_LABELS) as ColumnKey[]).map((c) => (
                    <label key={c} className="flex items-center justify-between gap-2 text-xs">
                      {COLUMN_LABELS[c]}
                      <input
                        type="checkbox"
                        checked={visibleCols[c]}
                        onChange={() =>
                          setVisibleCols((prev) => ({ ...prev, [c]: !prev[c] }))
                        }
                        className="accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        }
      />

      <p className="pb-3 text-xs text-muted-foreground">
        <span className="numeric font-medium text-foreground">{rows.length}</span> plots
      </p>

      <div className="panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low">
                {visibleCols.number && <th className="px-4 py-3 text-left"><SortHeader col="number" /></th>}
                {visibleCols.project && <th className="px-4 py-3 text-left"><SortHeader col="project" /></th>}
                {visibleCols.area && <th className="px-4 py-3 text-right"><SortHeader col="area" /></th>}
                {visibleCols.facing && <th className="px-4 py-3 text-left"><SortHeader col="facing" /></th>}
                {visibleCols.price && <th className="px-4 py-3 text-right"><SortHeader col="price" /></th>}
                {visibleCols.total && <th className="px-4 py-3 text-right"><SortHeader col="total" /></th>}
                {visibleCols.status && <th className="px-4 py-3 text-left"><SortHeader col="status" /></th>}
                {visibleCols.customer && <th className="px-4 py-3 text-left"><SortHeader col="customer" /></th>}
                {visibleCols.agent && <th className="px-4 py-3 text-left"><SortHeader col="agent" /></th>}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, project, customer, agent, price }, i) => (
                <tr
                  key={p.id}
                  className={"transition-colors hover:bg-surface-low " + (i % 2 === 1 ? "bg-surface/60" : "")}
                >
                  {visibleCols.number && (
                    <td className="numeric px-4 py-2.5 font-medium whitespace-nowrap">{p.number}</td>
                  )}
                  {visibleCols.project && <td className="px-4 py-2.5 whitespace-nowrap">{project}</td>}
                  {visibleCols.area && (
                    <td className="numeric px-4 py-2.5 text-right whitespace-nowrap">{p.areaSqYd} sq.yd</td>
                  )}
                  {visibleCols.facing && <td className="px-4 py-2.5 whitespace-nowrap">{p.facing}</td>}
                  {visibleCols.price && (
                    <td className="px-4 py-2.5 text-right">
                      <input
                        defaultValue={price}
                        onBlur={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isNaN(n) && n > 0) {
                            setPriceOverrides((prev) => ({ ...prev, [p.id]: n }));
                          }
                        }}
                        className="numeric w-24 rounded-md border border-transparent bg-transparent px-2 py-1 text-right text-sm outline-none transition-colors focus:border-outline-variant focus:bg-surface-low"
                      />
                    </td>
                  )}
                  {visibleCols.total && (
                    <td className="numeric px-4 py-2.5 text-right whitespace-nowrap">
                      {formatINR(price * p.areaSqYd, { compact: true })}
                    </td>
                  )}
                  {visibleCols.status && (
                    <td className="px-4 py-2.5">
                      <Chip>{statusLabel[p.status]}</Chip>
                    </td>
                  )}
                  {visibleCols.customer && (
                    <td className="px-4 py-2.5 whitespace-nowrap">{customer || "—"}</td>
                  )}
                  {visibleCols.agent && <td className="px-4 py-2.5 whitespace-nowrap">{agent || "—"}</td>}
                  <td className="px-3 text-right">
                    <Link
                      to="/plots/layout"
                      className="inline-flex text-xs text-muted-foreground hover:text-primary"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Nothing matches these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
