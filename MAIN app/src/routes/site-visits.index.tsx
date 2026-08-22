import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarPlus, MapPin, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader, FilterBar, Chip } from "@/components/kit";
import { byId, type SiteVisit } from "@/lib/mock-data";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/site-visits/")({
  head: () => ({
    meta: [
      { title: "Site Visits — Bhairava" },
      { name: "description", content: "Schedule, confirm and track customer site visits across every project." },
    ],
  }),
  component: SiteVisitsPage,
});

const views = ["Today", "Upcoming", "Completed", "Cancelled"];
const todayIso = new Date().toISOString().slice(0, 10);
const activeStatuses = new Set<SiteVisit["status"]>(["Scheduled", "Confirmed", "Rescheduled"]);

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function SiteVisitsPage() {
  const { siteVisits, customers, projects, agents } = useData();
  const [active, setActive] = useState("Today");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return siteVisits
      .filter((v) => {
        if (active === "Today") return v.date === todayIso && activeStatuses.has(v.status);
        if (active === "Upcoming") return v.date > todayIso && activeStatuses.has(v.status);
        if (active === "Completed") return v.status === "Completed";
        if (active === "Cancelled") return v.status === "Cancelled" || v.status === "No-show";
        return true;
      })
      .filter((v) => {
        if (!query) return true;
        const cust = byId(customers, v.customerId)?.name ?? "";
        const proj = byId(projects, v.projectId)?.name ?? "";
        const agent = byId(agents, v.agentId)?.name ?? "";
        return `${cust} ${proj} ${agent}`.toLowerCase().includes(query.toLowerCase());
      })
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
  }, [siteVisits, customers, projects, agents, active, query]);

  const todayCount = siteVisits.filter((v) => v.date === todayIso && activeStatuses.has(v.status)).length;
  const upcomingCount = siteVisits.filter((v) => v.date > todayIso && activeStatuses.has(v.status)).length;

  return (
    <AppShell>
      <PageHeader
        eyebrow="Operations"
        title="Site Visits"
        description="Schedule, confirm and track customer visits across every project."
        actions={
          <Link
            to="/site-visits/new"
            className="gradient-primary inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-primary-foreground shadow-ambient transition-all hover:shadow-glow active:scale-[0.97]"
          >
            <CalendarPlus className="h-4 w-4" /> Book Visit
          </Link>
        }
      />

      <div className="grid max-w-sm grid-cols-2 gap-3">
        <div className="panel p-3.5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Today&apos;s visits</p>
          <p className="numeric pt-1.5 text-2xl font-semibold">{todayCount}</p>
        </div>
        <div className="panel p-3.5">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Upcoming</p>
          <p className="numeric pt-1.5 text-2xl font-semibold">{upcomingCount}</p>
        </div>
      </div>

      <div className="pt-5">
        <FilterBar
          views={views}
          active={active}
          onSelect={setActive}
          query={query}
          onQuery={setQuery}
          placeholder="Search visits…"
        />
        <div className="space-y-2">
          {filtered.map((v) => (
            <VisitRow key={v.id} visit={v} />
          ))}
          {filtered.length === 0 && (
            <div className="panel p-8 text-center text-sm text-muted-foreground">No visits in this view.</div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function VisitRow({ visit }: { visit: SiteVisit }) {
  const { customers, projects, agents } = useData();
  const cust = byId(customers, visit.customerId);
  const proj = byId(projects, visit.projectId);
  const agent = byId(agents, visit.agentId);
  return (
    <Link
      to="/customers/$customerId"
      params={{ customerId: visit.customerId }}
      className="panel flex items-center gap-3 p-3.5 transition-colors hover:bg-surface-low"
    >
      <div className="w-14 shrink-0">
        <p className="numeric text-xs font-semibold">{visit.time}</p>
        <p className="numeric text-[10px] text-muted-foreground">{fmtDate(visit.date)}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{cust?.name ?? "—"}</p>
        <p className="truncate text-xs text-muted-foreground">{proj?.name ?? "—"}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {agent?.name ?? "—"}
          </span>
          {visit.plotInterest && visit.plotInterest.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {visit.plotInterest.join(", ")}
            </span>
          )}
        </div>
      </div>
      <Chip>{visit.status}</Chip>
    </Link>
  );
}
