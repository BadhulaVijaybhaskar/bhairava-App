import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ChangeEvent } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, FilterBar, Metric, NewRecordButton } from "@/components/kit";
import { AppShell } from "@/components/app-shell";
import { formatINR, type Project } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Project Portfolio — Bhairava" },
      { name: "description", content: "Track absorption, value and collections across all Bhairava land projects." },
      { property: "og:title", content: "Project Portfolio — Bhairava" },
      { property: "og:description", content: "Track absorption, value and collections across all Bhairava land projects." },
    ],
  }),
  component: ProjectsIndex,
});

const views = ["All", "Active", "Pre-launch", "Sold out", "On hold"];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function ProjectsIndex() {
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
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

const STATUS_OPTIONS: Project["status"][] = ["Pre-launch", "Active", "On hold", "Inactive"];

function ProjectStatusSelect({ project }: { project: Project }) {
  const { saveProject } = useData();
  const [saving, setSaving] = useState(false);
  // Always include the current value so legacy statuses (e.g. "Sold out") stay selectable/visible.
  const options = STATUS_OPTIONS.includes(project.status)
    ? STATUS_OPTIONS
    : [project.status, ...STATUS_OPTIONS];

  async function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Project["status"];
    if (saving || next === project.status) return;
    const previous = project.status;
    setSaving(true);
    saveProject({ ...project, status: next });
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 350));
    } catch {
      saveProject({ ...project, status: previous });
      toast.error("Couldn't update project status. Reverted.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="project-card-status relative z-10 w-full min-w-0" onClick={(e) => e.stopPropagation()}>
      <select
        aria-label={`Status for ${project.name}`}
        value={project.status}
        onChange={onChange}
        disabled={saving}
        className="project-card-status-select h-9 w-full min-w-0 appearance-none rounded-lg bg-surface-low pl-3 pr-8 text-xs font-medium text-foreground outline-none transition-shadow focus:ring-2 focus:ring-primary disabled:opacity-60"
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      {saving ? (
        <Loader2
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
        />
      ) : (
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        />
      )}
    </div>
  );
}

function ResaleSwitch({ project }: { project: Project }) {
  const { saveProject } = useData();
  const [saving, setSaving] = useState(false);
  const on = !!project.resaleAvailable;

  async function toggle() {
    if (saving) return;
    const previous = on;
    setSaving(true);
    saveProject({ ...project, resaleAvailable: !previous });
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
    } catch {
      saveProject({ ...project, resaleAvailable: previous });
      toast.error("Couldn't update resale availability. Reverted.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`Resale available for ${project.name}`}
      disabled={saving}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        void toggle();
      }}
      className={cn(
        "relative z-10 h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60",
        on ? "bg-primary" : "bg-surface-c",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow-ambient transition-transform",
          on ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

function ProjectRow({ project, zebra }: { project: Project; zebra: boolean }) {
  const pct = Math.round((project.soldPlots / project.totalPlots) * 100);
  const resaleOn = !!project.resaleAvailable;

  return (
    <div
      className={cn(
        "relative grid grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-4 transition-colors hover:bg-surface-low sm:px-5 lg:grid-cols-12 lg:gap-4",
        zebra ? "bg-surface/60" : "",
      )}
    >
      {/* Whole-row click target — sits behind the interactive status/resale controls. */}
      <Link
        to="/projects/$projectId"
        params={{ projectId: project.id }}
        aria-label={`Open ${project.name}`}
        className="absolute inset-0"
      />

      <div className="col-span-2 min-w-0 lg:col-span-3">
        <p className="truncate text-sm font-medium">{project.name}</p>
        <p className="numeric text-[11px] text-muted-foreground">{project.code}</p>
      </div>
      <div className="col-span-2 min-w-0 truncate text-xs text-muted-foreground lg:col-span-2 lg:text-sm">
        {project.location}, {project.city}
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
      <div className="col-span-1 lg:col-span-1 lg:text-right">
        <p className="numeric text-sm font-medium">{formatINR(project.valueCr * 1e7, { compact: true })}</p>
        <p className="numeric text-[11px] text-muted-foreground">
          collected {formatINR(project.collectedCr * 1e7, { compact: true })}
        </p>
      </div>
      <div className="col-span-1 flex items-center justify-end gap-2 lg:col-span-1">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-c text-[11px] font-semibold">
          {initials(project.manager)}
        </span>
      </div>

      {/*
        STATUS + RESALE — fixed two-column grid so changing status text
        (Active / Pre-launch / On hold / Inactive) never pushes Resale to a new row.
      */}
      <div className="project-card-controls relative z-10 col-span-2 pt-1 lg:col-span-3 lg:pt-0">
        <div className="project-card-status-block min-w-0 w-full">
          <span className="project-card-control-label mb-1 block text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Status
          </span>
          <ProjectStatusSelect project={project} />
        </div>
        <div className="project-card-resale flex shrink-0 flex-col items-end whitespace-nowrap">
          <span className="project-card-control-label mb-1 block text-[10px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Resale
          </span>
          <div className="project-card-resale-row flex items-center gap-2">
            <span className="project-card-resale-text text-xs text-muted-foreground" data-on={resaleOn ? "true" : "false"}>
              <span className="project-card-resale-full">{resaleOn ? "Available" : "Off"}</span>
              <span className="project-card-resale-short">{resaleOn ? "On" : "Off"}</span>
            </span>
            <ResaleSwitch project={project} />
          </div>
        </div>
      </div>
    </div>
  );
}
