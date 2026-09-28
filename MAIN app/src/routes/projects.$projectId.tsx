import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Chip, Panel, RecordHeader } from "@/components/kit";
import { ScrollTabs } from "@/components/scroll-tabs";
import { ProjectEditor } from "@/components/record-editors";
import { ProjectOverviewTab } from "@/components/project-workspace/overview-tab";
import { ProjectSetupTab } from "@/components/project-workspace/setup-tab";
import { ProjectLayoutTab } from "@/components/project-workspace/layout-tab";
import { ComingSoonPanel } from "@/components/project-workspace/coming-soon-panel";
import { ProjectSalesTab } from "@/components/project-workspace/sales-tab";
import { ProjectFinanceTab } from "@/components/project-workspace/finance-tab";
import { ProjectDocumentsTab } from "@/components/project-workspace/documents-tab";
import { byId, projects as seedProjects } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import {
  deriveInventoryFunnel,
  evaluateProjectReadiness,
  projectLifecycleOf,
} from "@/lib/domain/overview-metrics";
import { LIFECYCLE_LABEL } from "@/lib/domain/lifecycle";
import { setupAccessForRole, layoutAccessForRole } from "@/lib/domain/project-permissions";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "setup", label: "Setup" },
  { key: "layout", label: "Layout & Plots" },
  { key: "sales", label: "Sales" },
  { key: "finance", label: "Finance" },
  { key: "documents", label: "Documents" },
  { key: "team", label: "Team" },
  { key: "activity", label: "Activity" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type Search = { tab?: TabKey };

function parseTab(raw: unknown): TabKey {
  const v = typeof raw === "string" ? raw.toLowerCase() : "";
  const hit = TABS.find((t) => t.key === v);
  return hit?.key ?? "overview";
}

export const Route = createFileRoute("/projects/$projectId")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const tab = parseTab(search["tab"]);
    return tab === "overview" ? {} : { tab };
  },
  head: ({ params }) => {
    const project = byId(seedProjects, params.projectId);
    const title = project ? `${project.name} — Project workspace` : "Project not found";
    return {
      meta: [
        { title: `${title} — Bhairava` },
        {
          name: "description",
          content: `Portfolio OS workspace for ${project?.name ?? "this project"}.`,
        },
        { property: "og:title", content: `${title} — Bhairava` },
      ],
    };
  },
  component: ProjectWorkspace,
});

function ProjectWorkspace() {
  const { projectId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const tab = parseTab(search.tab);
  const { projects: projectList, plots, bookings, saveProject } = useData();
  const project = byId(projectList, projectId);
  const session = getSession();
  const setupAccess = setupAccessForRole(session?.role);
  const layoutAccess = layoutAccessForRole(session?.role);

  if (!project) {
    return (
      <AppShell>
        <Panel className="mt-10 text-center">
          <h2 className="font-display text-lg font-semibold">Project not found</h2>
          <p className="pt-2 text-sm text-muted-foreground">
            No project matches “{projectId}”. It may have been archived or renamed.
          </p>
          <Link to="/projects" className="mt-4 inline-flex text-sm font-medium text-primary">
            Back to Project Portfolio
          </Link>
        </Panel>
      </AppShell>
    );
  }

  const projectPlots = plots.filter((p) => p.projectId === project.id);
  const projectBookings = bookings.filter((b) => b.projectId === project.id);
  const lifecycle = projectLifecycleOf(project);
  const funnel = deriveInventoryFunnel(projectPlots);
  const readiness = evaluateProjectReadiness(
    project as unknown as Record<string, unknown>,
    projectPlots as unknown as Array<Record<string, unknown>>,
  );

  const setTab = (next: TabKey) => {
    void navigate({
      search: next === "overview" ? {} : { tab: next },
      replace: true,
    });
  };

  return (
    <AppShell>
      <RecordHeader
        eyebrow={project.code}
        title={project.name}
        subtitle={
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {project.location}, {project.city}
              {project.state ? `, ${project.state}` : ""}
            </span>
            <Chip tone="info">{LIFECYCLE_LABEL[lifecycle]}</Chip>
            {project.agentVisible ? (
              <Chip tone="positive">Agent visible</Chip>
            ) : (
              <Chip>Agent hidden</Chip>
            )}
            {project.customerListed ? (
              <Chip tone="positive">Customer listed</Chip>
            ) : (
              <Chip>Not listed</Chip>
            )}
            <Chip tone={readiness.blockers.length ? "warning" : "positive"}>
              {`Readiness ${readiness.percent}%`}
            </Chip>
            {project.approvals.map((a) => (
              <Chip key={a} tone="info">
                {a}
              </Chip>
            ))}
          </div>
        }
        facts={[
          { label: "Total plots", value: funnel.total || project.totalPlots },
          {
            label: "Available",
            value: funnel.total ? funnel.counts.AVAILABLE : "—",
          },
          {
            label: "Reserved",
            value: funnel.total ? funnel.counts.RESERVED : "—",
          },
          {
            label: "Booked",
            value: funnel.total ? funnel.counts.BOOKED : "—",
          },
          {
            label: "Sold / Registered",
            value: funnel.total
              ? `${funnel.counts.SOLD} / ${funnel.counts.REGISTERED}`
              : "—",
          },
          {
            label: "Errors / Warnings",
            value: `${readiness.blockers.length} / ${readiness.warnings.length}`,
          },
        ]}
        actions={
          <>
            {setupAccess === "full" && <ProjectEditor project={project} />}
            <Link
              to="/onboarding/plot"
              search={{ projectId: project.id }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface-c px-3 py-2 text-sm font-medium"
            >
              Add plot
            </Link>
            <Link
              to="/plots/layout"
              className="gradient-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Open live layout <ArrowUpRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      <ScrollTabs activeKey={tab} className="mt-6 rounded-xl bg-surface-low p-1 lg:overflow-x-visible">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            data-active={tab === t.key ? "true" : undefined}
            onClick={() => setTab(t.key)}
            className={`flex-none whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:flex-1 ${
              tab === t.key
                ? "bg-surface-lowest text-foreground shadow-ambient"
                : "text-muted-foreground hover:bg-surface-c"
            }`}
          >
            {t.label}
          </button>
        ))}
      </ScrollTabs>

      <div className="pt-6">
        {tab === "overview" && (
          <ProjectOverviewTab
            project={project}
            plots={projectPlots}
            bookings={projectBookings}
          />
        )}
        {tab === "setup" && (
          <ProjectSetupTab
            project={project}
            plots={projectPlots}
            access={setupAccess}
            onSave={saveProject}
          />
        )}
        {tab === "layout" && (
          <ProjectLayoutTab
            project={project}
            plots={projectPlots}
            access={layoutAccess}
          />
        )}
        {tab === "sales" && (
          <ProjectSalesTab project={project} plots={projectPlots} />
        )}
      {tab === "finance" && (
        <ProjectFinanceTab project={project} />
      )}
        {tab === "documents" && (
          <ProjectDocumentsTab project={project} />
        )}
        {tab === "team" && (
          <ComingSoonPanel title="Team" description="Agent assignment for this project ships in P5." />
        )}
        {tab === "activity" && (
          <ComingSoonPanel title="Activity" description="Filterable project audit ships in P5. Overview shows a recent slice when available." />
        )}
      </div>
    </AppShell>
  );
}
