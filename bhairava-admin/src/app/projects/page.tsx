"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, FilterBar, Metric, Chip, NewRecordButton } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { formatINR, type Project } from "@/lib/mock-data";
import { useData } from "@/lib/store";

const views = ["All", "Active", "Pre-launch", "Sold out", "On hold"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProjectsIndex() {
  const { projects } = useData();
  const [active, setActive] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (active !== "All" && p.status !== active) return false;
      if (query && !`${p.name} ${p.code} ${p.location} ${p.city}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [projects, active, query]);

  const totalValue = projects.reduce((a, p) => a + p.valueCr, 0);
  const totalSold = projects.reduce((a, p) => a + p.soldPlots, 0);
  const activeCount = projects.filter((p) => p.status === "Active").length;
  const avgAbsorption =
    projects.reduce((a, p) => a + p.soldPlots / p.totalPlots, 0) / (projects.length || 1);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inventory"
        title="Project Portfolio"
        description="All land parcels currently in the sales pipeline, from pre-launch to sold out."
        actions={<NewRecordButton to="/onboarding/project">New project</NewRecordButton>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total inventory value" value={`₹${totalValue.toFixed(1)} Cr`} hint="across portfolio" />
        <Metric label="Plots sold" value={String(totalSold)} hint={`of ${projects.reduce((a, p) => a + p.totalPlots, 0)}`} />
        <Metric label="Active projects" value={String(activeCount)} hint={`of ${projects.length}`} />
        <Metric label="Avg absorption" value={`${Math.round(avgAbsorption * 100)}%`} hint="sold vs total" />
      </div>

      <div className="pt-6">
        <FilterBar views={views} active={active} onSelect={setActive} query={query} onQuery={setQuery} placeholder="Search projects…" />

        <div className="panel divide-y divide-transparent overflow-hidden p-0">
          {filtered.map((p, i) => (
            <ProjectRow key={p.id} project={p} zebra={i % 2 === 1} />
          ))}
          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              Nothing matches these filters.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ProjectRow({ project, zebra }: { project: Project; zebra: boolean }) {
  const pct = Math.round((project.soldPlots / project.totalPlots) * 100);
  return (
    <Link
      href={`/projects/${project.id}`}
      className={`grid grid-cols-2 items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-low sm:px-5 lg:grid-cols-12 lg:gap-4 ${
        zebra ? "bg-surface/60" : ""
      }`}
    >
      <div className="col-span-2 min-w-0 lg:col-span-3">
        <p className="truncate text-sm font-medium">{project.name}</p>
        <p className="numeric text-[11px] text-muted-foreground">{project.code}</p>
      </div>
      <div className="col-span-1 min-w-0 truncate text-xs text-muted-foreground lg:col-span-2 lg:text-sm">
        {project.location}, {project.city}
      </div>
      <div className="col-span-1 flex justify-end lg:col-span-1 lg:justify-start">
        <Chip>{project.status}</Chip>
      </div>
      <div className="col-span-2 lg:col-span-2">
        <div className="flex items-center justify-between">
          <span className="numeric text-xs text-muted-foreground">
            {project.soldPlots}/{project.totalPlots}
          </span>
          <span className="numeric text-xs text-muted-foreground">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-c">
          <div className="gradient-primary h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="col-span-1 lg:col-span-2 lg:text-right">
        <p className="numeric text-sm font-medium">{formatINR(project.valueCr * 1e7, { compact: true })}</p>
        <p className="numeric text-[11px] text-muted-foreground">
          collected {formatINR(project.collectedCr * 1e7, { compact: true })}
        </p>
      </div>
      <div className="col-span-1 flex items-center justify-end gap-2 lg:col-span-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">
          {initials(project.manager)}
        </span>
        <span className="hidden truncate text-xs text-muted-foreground lg:inline">{project.manager}</span>
      </div>
    </Link>

  );
}
