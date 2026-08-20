import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/kit";
import {
  Field,
  NumberInput,
  SelectInput,
  TextInput,
  Wizard,
  type WizardStep,
} from "@/components/form-kit";
import { byId, formatINR, type Plot, type PlotStatus } from "@/lib/mock-data";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/onboarding/plot")({
  head: () => ({ meta: [{ title: "Add a plot — Bhairava" }] }),
  component: NewPlot,
});

const FACINGS = ["East", "West", "North", "South"] as const;
const STATUSES: PlotStatus[] = ["available", "reserved", "booked", "registered", "resale"];

function nextPlotId(plots: Plot[], code: string) {
  let max = 0;
  for (const p of plots) {
    const m = /^PLT-(\d+)/.exec(p.id);
    if (m?.[1]) max = Math.max(max, Number(m[1]));
  }
  return `PLT-${String(max + 1).padStart(4, "0")}-${code}`;
}

function NewPlot() {
  const navigate = useNavigate();
  const { projects, plots, customers, agents, savePlot, saveProject } = useData();

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const prefillProject = params?.get("projectId") ?? "";

  const [projectId, setProjectId] = useState(
    prefillProject && projects.some((p) => p.id === prefillProject) ? prefillProject : projects[0]?.id ?? "",
  );
  const [number, setNumber] = useState("");
  const [areaSqYd, setAreaSqYd] = useState(200);
  const [facing, setFacing] = useState<(typeof FACINGS)[number]>("East");
  const [pricePerSqYd, setPricePerSqYd] = useState(25000);
  const [status, setStatus] = useState<PlotStatus>("available");
  const [customerId, setCustomerId] = useState("");
  const [agentId, setAgentId] = useState("");

  const project = byId(projects, projectId);
  const customer = byId(customers, customerId);
  const agent = byId(agents, agentId);
  const total = areaSqYd * pricePerSqYd;
  const dirty = number.trim() !== "" || areaSqYd !== 200;

  const suggestedNumber = useMemo(() => {
    if (!project) return "";
    const count = plots.filter((p) => p.projectId === project.id).length + 1;
    return `${project.code}-${String(count).padStart(3, "0")}`;
  }, [project, plots]);

  const steps: WizardStep[] = [
    {
      title: "Identity",
      summary: "Which project and plot number.",
      validate: () => {
        if (!projectId) return "Select a project.";
        const num = (number.trim() || suggestedNumber).trim();
        if (!num) return "Plot number is required.";
        if (plots.some((p) => p.projectId === projectId && p.number.toLowerCase() === num.toLowerCase())) {
          return "That plot number already exists in this project.";
        }
        return undefined;
      },
      content: (
        <>
          <Field label="Project" required>
            <SelectInput
              value={projectId}
              onChange={setProjectId}
              options={projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.code}` }))}
            />
          </Field>
          <Field label="Plot number" required hint={`Suggested ${suggestedNumber || "from project code"}`}>
            <TextInput value={number} onChange={setNumber} placeholder={suggestedNumber || "BGF-101"} />
          </Field>
        </>
      ),
    },
    {
      title: "Specs",
      summary: "Area, facing and rate.",
      validate: () =>
        areaSqYd < 1 ? "Enter a valid area." : pricePerSqYd < 1 ? "Enter a valid rate." : undefined,
      content: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Area (sq. yd)" required>
              <NumberInput value={areaSqYd} onChange={setAreaSqYd} />
            </Field>
            <Field label="Facing">
              <SelectInput value={facing} onChange={setFacing} options={FACINGS} />
            </Field>
          </div>
          <Field label="Price / sq. yd" required>
            <NumberInput value={pricePerSqYd} onChange={setPricePerSqYd} />
          </Field>
          <p className="numeric text-sm text-muted-foreground">
            Total value {formatINR(total, { compact: true })}
          </p>
        </>
      ),
    },
    {
      title: "Review",
      summary: "Status and optional ownership, then create.",
      content: (
        <>
          <Field label="Status">
            <SelectInput value={status} onChange={setStatus} options={STATUSES} />
          </Field>
          {status !== "available" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Customer">
                <SelectInput
                  value={customerId}
                  onChange={setCustomerId}
                  options={[{ value: "", label: "Unassigned" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
                />
              </Field>
              <Field label="Agent">
                <SelectInput
                  value={agentId}
                  onChange={setAgentId}
                  options={[{ value: "", label: "Unassigned" }, ...agents.map((a) => ({ value: a.id, label: a.name }))]}
                />
              </Field>
            </div>
          )}
          <div className="rounded-xl bg-surface-low p-3.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Summary</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Project</dt>
                <dd className="truncate font-medium">{project?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Plot</dt>
                <dd className="numeric font-medium">{number.trim() || suggestedNumber || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Specs</dt>
                <dd className="numeric font-medium">
                  {areaSqYd} sq.yd · {facing}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Value</dt>
                <dd className="numeric font-medium">{formatINR(total, { compact: true })}</dd>
              </div>
              {customer && (
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Owner</dt>
                  <dd className="truncate font-medium">{customer.name}{agent ? ` · ${agent.name}` : ""}</dd>
                </div>
              )}
            </dl>
          </div>
        </>
      ),
    },
  ];

  const complete = () => {
    if (!project) return;
    const plotNumber = number.trim() || suggestedNumber;
    const plot: Plot = {
      id: nextPlotId(plots, project.code),
      number: plotNumber,
      projectId: project.id,
      areaSqYd,
      facing,
      pricePerSqYd,
      status,
      points: [
        [4, 4],
        [12, 4],
        [12, 12],
        [4, 12],
      ],
      ...(status !== "available" && customerId ? { customerId } : {}),
      ...(status !== "available" && agentId ? { agentId } : {}),
    };
    savePlot(plot);
    saveProject({ ...project, totalPlots: project.totalPlots + 1 });
    toast.success("Plot created");
    void navigate({ to: "/plots" });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Inventory"
        title="Add a plot"
        description="Three short steps. Pricing stays editable from the inventory list."
      />
      <Wizard
        steps={steps}
        onComplete={complete}
        submitLabel="Create Plot"
        dirty={dirty}
        onDiscard={() => void navigate({ to: "/plots" })}
        aside={
          <Panel tonal className="text-xs leading-relaxed text-muted-foreground">
            New plots land as Available unless you assign a customer on the last step.
          </Panel>
        }
      />
    </AppShell>
  );
}
