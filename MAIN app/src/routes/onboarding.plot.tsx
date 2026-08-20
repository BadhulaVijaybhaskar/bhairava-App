import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  OnboardingShell,
  ReviewList,
  useOnboardingDraft,
  type FieldErrors,
  type WizardStep,
} from "@/components/onboarding";
import {
  Checkbox,
  Field,
  NumberInput,
  SelectInput,
  TextInput,
  TextareaInput,
} from "@/components/form-kit";
import { defaultPlotPolygon, useData } from "@/lib/store";
import type { Plot, PlotStatus } from "@/lib/mock-data";
import { FACINGS } from "@/lib/project-config";

const PLOT_TYPES = ["Standard", "Premium", "Commercial", "Irregular", "Villa", "Farm"] as const;
const PLOT_STATUSES: PlotStatus[] = ["available", "reserved", "booked", "registered", "resale"];

type Search = { projectId?: string };

export const Route = createFileRoute("/onboarding/plot")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const projectId = typeof search["projectId"] === "string" ? search["projectId"] : undefined;
    return projectId ? { projectId } : {};
  },
  head: () => ({
    meta: [
      { title: "Add a plot — Bhairava" },
      { name: "description", content: "Add a plot to inventory in three focused steps." },
      { property: "og:title", content: "Add a plot — Bhairava" },
    ],
  }),
  component: AddPlot,
});

function AddPlot() {
  const navigate = useNavigate();
  const { projectId: presetProject } = Route.useSearch();
  const { projects, plots, savePlot, saveProject, nextId } = useData();

  const blank = {
    projectId:
      presetProject && projects.some((p) => p.id === presetProject)
        ? presetProject
        : (projects[0]?.id ?? ""),
    number: "",
    block: "",
    phase: "",
    plotType: "Standard" as (typeof PLOT_TYPES)[number],
    areaSqYd: 200,
    lengthFt: 45,
    widthFt: 40,
    facing: "East" as Plot["facing"],
    roadWidthFt: 30,
    pricePerSqYd: 25000,
    status: "available" as PlotStatus,
    resale: false,
    notes: "",
  };

  const [f, setF, clearDraft] = useOnboardingDraft(`plot:${presetProject ?? "any"}`, blank);
  const [err, setErr] = useState<FieldErrors<typeof blank>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };
  const dirty = JSON.stringify({ ...f, projectId: blank.projectId }) !== JSON.stringify(blank);
  const project = projects.find((p) => p.id === f.projectId);

  const check = (map: FieldErrors<typeof blank>) => {
    setErr((p) => ({ ...p, ...map }));
    return Object.values(map).some(Boolean) ? "Fix the highlighted fields to continue." : undefined;
  };

  const steps: WizardStep[] = [
    {
      title: "Plot identity",
      summary: "Which parcel this plot belongs to.",
      validate: () =>
        check({
          projectId: f.projectId ? undefined : "Select a project.",
          number: f.number.trim() ? undefined : "Plot number is required.",
        }),
      content: (
        <>
          <Field label="Project" required error={err.projectId}>
            <SelectInput
              value={f.projectId}
              onChange={(v) => set("projectId", v)}
              placeholder="Select project"
              invalid={!!err.projectId}
              options={projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.code}` }))}
            />
          </Field>
          <Field label="Plot number" required error={err.number}>
            <TextInput
              value={f.number}
              onChange={(v) => set("number", v.toUpperCase())}
              placeholder="A-101"
              invalid={!!err.number}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Block / phase">
              <TextInput value={f.block} onChange={(v) => set("block", v)} placeholder="Block A" />
            </Field>
            <Field label="Phase">
              <TextInput value={f.phase} onChange={(v) => set("phase", v)} placeholder="Phase 1" />
            </Field>
          </div>
          <Field label="Plot type">
            <SelectInput
              value={f.plotType}
              onChange={(v) => set("plotType", v)}
              options={PLOT_TYPES}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Dimensions & pricing",
      summary: "Area, facing and the base rate.",
      validate: () =>
        check({
          areaSqYd: f.areaSqYd > 0 ? undefined : "Area is required.",
          pricePerSqYd: f.pricePerSqYd > 0 ? undefined : "Base price is required.",
        }),
      content: (
        <>
          <Field label="Area (sq yd)" required error={err.areaSqYd}>
            <NumberInput value={f.areaSqYd} onChange={(v) => set("areaSqYd", v)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Length (ft)">
              <NumberInput value={f.lengthFt} onChange={(v) => set("lengthFt", v)} />
            </Field>
            <Field label="Width (ft)">
              <NumberInput value={f.widthFt} onChange={(v) => set("widthFt", v)} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Facing">
              <SelectInput value={f.facing} onChange={(v) => set("facing", v)} options={FACINGS} />
            </Field>
            <Field label="Road width (ft)">
              <NumberInput value={f.roadWidthFt} onChange={(v) => set("roadWidthFt", v)} />
            </Field>
          </div>
          <Field label="Base price / sq yd" required error={err.pricePerSqYd}>
            <NumberInput value={f.pricePerSqYd} onChange={(v) => set("pricePerSqYd", v)} />
          </Field>
        </>
      ),
    },
    {
      title: "Availability",
      summary: "Status, resale and a last check before saving.",
      content: (
        <>
          <Field label="Status">
            <SelectInput
              value={f.status}
              onChange={(v) => set("status", v)}
              options={PLOT_STATUSES.map((s) => ({
                value: s,
                label: s[0]!.toUpperCase() + s.slice(1),
              }))}
            />
          </Field>
          <Field label="Resale status">
            <Checkbox
              checked={f.resale}
              onChange={(v) => {
                set("resale", v);
                if (v) set("status", "resale");
              }}
              label="Listed for resale"
              hint="Independent of the primary availability status."
            />
          </Field>
          <Field label="Additional details">
            <TextareaInput
              value={f.notes}
              onChange={(v) => set("notes", v)}
              rows={2}
              placeholder="Corner, park facing…"
            />
          </Field>
          <ReviewList
            rows={[
              { label: "Project", value: project?.name ?? "—", step: 0 },
              { label: "Plot", value: f.number, step: 0 },
              { label: "Type", value: f.plotType, step: 0 },
              { label: "Area", value: `${f.areaSqYd} sq yd`, step: 1 },
              { label: "Facing", value: f.facing, step: 1 },
              {
                label: "Price / sq yd",
                value: `₹${f.pricePerSqYd.toLocaleString("en-IN")}`,
                step: 1,
              },
              { label: "Status", value: f.resale ? "Resale" : f.status },
            ]}
          />
        </>
      ),
    },
  ];

  const complete = () => {
    const id = nextId("PLT-", plots);
    const plot: Plot = {
      id,
      number: f.number.trim(),
      projectId: f.projectId,
      areaSqYd: f.areaSqYd,
      facing: f.facing,
      pricePerSqYd: f.pricePerSqYd,
      status: f.resale ? "resale" : f.status,
      points: defaultPlotPolygon(plots.filter((p) => p.projectId === f.projectId).length),
      block: f.block.trim(),
      phase: f.phase.trim(),
      plotType: f.plotType,
      lengthFt: f.lengthFt,
      widthFt: f.widthFt,
      roadWidthFt: f.roadWidthFt,
      notes: f.notes.trim(),
    };
    savePlot(plot);
    if (project) saveProject({ ...project, totalPlots: project.totalPlots + 1 });
    clearDraft();
    void navigate({ to: "/plots" });
  };

  return (
    <OnboardingShell
      eyebrow="Inventory"
      title="Add a plot"
      description="Identity, dimensions and availability — then a compact review."
      steps={steps}
      onComplete={complete}
      submitLabel="Create plot"
      dirty={dirty}
      onDiscard={() => {
        clearDraft();
        void navigate({ to: "/plots" });
      }}
    />
  );
}
