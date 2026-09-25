import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Chip, Metric, Panel, SectionTitle, Timeline } from "@/components/kit";
import type { Booking, Plot, Project } from "@/lib/mock-data";
import { formatINR, auditLog } from "@/lib/mock-data";
import {
  deriveCollectionsSummary,
  deriveCornerPremiumCounts,
  deriveFacingMix,
  deriveInventoryFunnel,
  derivePlotSizeMix,
  deriveRegistrationCount,
  deriveSalesSummary,
  evaluateProjectReadiness,
  PLOT_STATUSES,
  projectLifecycleOf,
  type MetricValue,
} from "@/lib/domain";
import { LIFECYCLE_LABEL } from "@/lib/domain/lifecycle";

function Unavailable({ note }: { note?: string | undefined }) {
  return (
    <div className="rounded-lg border border-dashed border-outline-variant/40 bg-surface-low/50 px-3 py-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground/80">Unavailable</p>
      <p className="pt-1 text-xs">{note ?? "Cannot be derived from current store data."}</p>
    </div>
  );
}

function MetricBlock<T>({
  label,
  metric,
  render,
}: {
  label: string;
  metric: MetricValue<T>;
  render: (value: T) => ReactNode;
}) {
  return (
    <div>
      <p className="pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {label}
      </p>
      {metric.availability === "derived" && metric.value != null ? (
        render(metric.value)
      ) : (
        <Unavailable {...(metric.note ? { note: metric.note } : {})} />
      )}
    </div>
  );
}

export function ProjectOverviewTab({
  project,
  plots,
  bookings,
}: {
  project: Project;
  plots: Plot[];
  bookings: Booking[];
}) {
  const lifecycle = projectLifecycleOf(project);
  const funnel = deriveInventoryFunnel(plots);
  // Prefer inventory embedded on project when present (has corner/features)
  const inventorySource =
    project.inventory && project.inventory.length > 0
      ? project.inventory
      : plots.map((p) => ({
          areaSqYd: p.areaSqYd,
          facing: p.facing,
          corner: "Not corner",
          features: [] as string[],
          status: p.status,
        }));

  const sizeMixReal = derivePlotSizeMix(inventorySource);
  const facingMixReal = deriveFacingMix(inventorySource);
  const cornerReal = deriveCornerPremiumCounts(inventorySource);
  const sales = deriveSalesSummary(bookings);
  const collections = deriveCollectionsSummary(bookings);
  const registrations = deriveRegistrationCount(plots);
  const readiness = evaluateProjectReadiness(
    project as unknown as Record<string, unknown>,
    plots as unknown as Array<Record<string, unknown>>,
  );

  const attention = [
    ...readiness.blockers.map((b) => ({ tone: "danger" as const, text: b.message, id: b.id })),
    ...readiness.warnings.slice(0, 4).map((w) => ({
      tone: "warning" as const,
      text: w.message,
      id: w.id,
    })),
  ];

  const recent = auditLog.slice(0, 6).map((a) => ({
    time: a.time,
    title: a.action,
    detail: `${a.actor} · ${a.object}`,
  }));

  // Prefer project-scoped audit when object mentions project code / id
  const scoped = auditLog
    .filter(
      (a) =>
        a.object.includes(project.id) ||
        a.object.includes(project.code) ||
        false,
    )
    .slice(0, 6);

  const activityItems =
    scoped.length > 0
      ? scoped.map((a) => ({ time: a.time, title: a.action, detail: `${a.actor} · ${a.object}` }))
      : recent.length > 0
        ? [
            {
              time: "—",
              title: "No project-scoped audit rows",
              detail: "Showing recent org audit as context only — not project-filtered facts.",
            },
            ...recent.slice(0, 3),
          ]
        : [
            {
              time: "—",
              title: "Activity unavailable",
              detail: "No audit entries in store for this project.",
            },
          ];

  const absorptionPct =
    funnel.total > 0
      ? Math.round(
          ((funnel.counts.SOLD + funnel.counts.REGISTERED + funnel.counts.BOOKED) / funnel.total) *
            100,
        )
      : null;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel className="lg:col-span-12">
        <SectionTitle aside={`${readiness.percent}% checklist`}>Readiness</SectionTitle>
        <div className="flex flex-wrap items-center gap-2 pb-3">
          <Chip tone="info">{LIFECYCLE_LABEL[lifecycle]}</Chip>
          {project.agentVisible ? <Chip tone="positive">Agent visible</Chip> : <Chip>Agent hidden</Chip>}
          {project.customerListed ? <Chip tone="positive">Customer listed</Chip> : <Chip>Not customer-listed</Chip>}
          <span className="text-sm text-muted-foreground">
            Activate: {readiness.canActivate ? "ready" : "blocked"} · Agent publish:{" "}
            {readiness.canSetAgentVisible ? "ready" : "blocked"} · Customer publish:{" "}
            {readiness.canSetCustomerListed ? "ready" : "blocked"}
          </span>
        </div>
        {attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">No blockers or warnings.</p>
        ) : (
          <ul className="space-y-2">
            {attention.map((a) => (
              <li
                key={a.id + a.text}
                className="flex items-start gap-2 rounded-lg bg-surface-low px-3 py-2 text-sm"
              >
                <Chip tone={a.tone === "danger" ? "danger" : "warning"}>
                  {a.tone === "danger" ? "Error" : "Warning"}
                </Chip>
                <span>{a.text}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="lg:col-span-7">
        <SectionTitle aside={funnel.total ? `${funnel.total} plots` : undefined}>
          Inventory funnel
        </SectionTitle>
        {funnel.total === 0 ? (
          <Unavailable note="No plots in store for this project — status counts unavailable." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PLOT_STATUSES.map((s) => (
              <Metric
                key={s}
                label={funnel.labels[s]}
                value={String(funnel.counts[s])}
              />
            ))}
            {absorptionPct != null && (
              <Metric label="Absorption (booked+sold+reg)" value={`${absorptionPct}%`} />
            )}
          </div>
        )}
      </Panel>

      <Panel className="lg:col-span-5" tonal>
        <SectionTitle>Attention</SectionTitle>
        {attention.length === 0 ? (
          <p className="text-sm text-muted-foreground">All clear for current checklist.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {attention.slice(0, 6).map((a) => (
              <li key={`att-${a.id}`} className="text-muted-foreground">
                <span className="font-medium text-foreground">{a.id}</span> — {a.text}
              </li>
            ))}
          </ul>
        )}
        <div className="pt-4">
          <Link to="/projects/$projectId" search={{ tab: "setup" }} params={{ projectId: project.id }} className="text-sm font-medium text-primary">
            Open Setup →
          </Link>
        </div>
      </Panel>

      <Panel className="lg:col-span-4">
        <SectionTitle>Plot size mix</SectionTitle>
        <MetricBlock
          label="By area (sq yd)"
          metric={sizeMixReal}
          render={(rows) => (
            <ul className="space-y-1 text-sm">
              {rows.slice(0, 8).map((r) => (
                <li key={r.areaSqYd} className="flex justify-between">
                  <span>{r.areaSqYd} sq yd</span>
                  <span className="numeric">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        />
      </Panel>

      <Panel className="lg:col-span-4">
        <SectionTitle>Facing mix</SectionTitle>
        <MetricBlock
          label="By facing"
          metric={facingMixReal}
          render={(rows) => (
            <ul className="space-y-1 text-sm">
              {rows.map((r) => (
                <li key={r.facing} className="flex justify-between">
                  <span>{r.facing}</span>
                  <span className="numeric">{r.count}</span>
                </li>
              ))}
            </ul>
          )}
        />
      </Panel>

      <Panel className="lg:col-span-4">
        <SectionTitle>Corner / premium inventory</SectionTitle>
        <MetricBlock
          label="Counts"
          metric={cornerReal}
          render={(v) => (
            <ul className="space-y-1 text-sm">
              <li className="flex justify-between"><span>Corner</span><span className="numeric">{v.corner}</span></li>
              <li className="flex justify-between"><span>Park facing</span><span className="numeric">{v.parkFacing}</span></li>
              <li className="flex justify-between"><span>Main road</span><span className="numeric">{v.mainRoad}</span></li>
              <li className="flex justify-between"><span>Premium location</span><span className="numeric">{v.premium}</span></li>
            </ul>
          )}
        />
        {!(project.inventory && project.inventory.length) && plots.length > 0 && (
          <p className="pt-2 text-xs text-muted-foreground">
            Corner/feature fields come from project.inventory templates; layout Plot rows lack those attributes — counts may be zero until Setup inventory is filled.
          </p>
        )}
      </Panel>

      <Panel className="lg:col-span-6">
        <SectionTitle>Sales / collections</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricBlock
            label="Sales (from bookings)"
            metric={sales}
            render={(v) => (
              <div className="space-y-1 text-sm">
                <p>Bookings: <span className="numeric">{v.bookingCount}</span></p>
                <p>Amount: <span className="numeric">{formatINR(v.bookedAmount, { compact: true })}</span></p>
              </div>
            )}
          />
          <MetricBlock
            label="Collections / outstanding"
            metric={collections}
            render={(v) => (
              <div className="space-y-1 text-sm">
                <p>Collected: <span className="numeric">{formatINR(v.collected, { compact: true })}</span></p>
                <p>Outstanding: <span className="numeric">{formatINR(v.outstanding, { compact: true })}</span></p>
              </div>
            )}
          />
        </div>
        <div className="pt-4">
          <MetricBlock
            label="Registrations"
            metric={registrations}
            render={(n) => <p className="numeric text-lg font-medium">{n}</p>}
          />
        </div>
      </Panel>

      <Panel className="lg:col-span-6" tonal>
        <SectionTitle>Recent activity</SectionTitle>
        <Timeline items={activityItems} />
      </Panel>
    </div>
  );
}
