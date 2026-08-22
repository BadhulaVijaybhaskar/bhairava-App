import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { useData } from "@/lib/store";
import type { SiteVisit } from "@/lib/mock-data";

type Search = { customerId?: string; projectId?: string };

export const Route = createFileRoute("/onboarding/visit")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const next: Search = {};
    if (typeof search["customerId"] === "string") next.customerId = search["customerId"];
    if (typeof search["projectId"] === "string") next.projectId = search["projectId"];
    return next;
  },
  head: () => ({
    meta: [
      { title: "Book a site visit — Bhairava" },
      {
        name: "description",
        content: "Schedule a site visit for a buyer against a project and plots.",
      },
      { property: "og:title", content: "Book a site visit — Bhairava" },
    ],
  }),
  component: BookVisit,
});

function BookVisit() {
  const navigate = useNavigate();
  const preset = Route.useSearch();
  const { customers, projects, plots, agents, siteVisits, saveVisit, saveCustomer, nextId } =
    useData();

  const blank = {
    customerId:
      preset.customerId && customers.some((c) => c.id === preset.customerId)
        ? preset.customerId
        : "",
    projectId:
      preset.projectId && projects.some((p) => p.id === preset.projectId) ? preset.projectId : "",
    plotId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "11:00",
    agentId: agents.find((a) => a.status === "Active")?.id ?? agents[0]?.id ?? "",
    visitors: 2,
    pickup: false,
    notes: "",
  };

  const [f, setF, clearDraft] = useOnboardingDraft(
    `visit:${preset.customerId ?? ""}:${preset.projectId ?? ""}`,
    blank,
  );
  const [err, setErr] = useState<FieldErrors<typeof blank>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };
  const dirty =
    JSON.stringify({ ...f, customerId: blank.customerId, projectId: blank.projectId }) !==
    JSON.stringify(blank);

  const customer = customers.find((c) => c.id === f.customerId);
  const project = projects.find((p) => p.id === f.projectId);
  const interestedPlots = useMemo(
    () =>
      plots
        .filter(
          (p) => p.projectId === f.projectId && (p.status === "available" || p.status === "resale"),
        )
        .slice(0, 80),
    [plots, f.projectId],
  );

  const check = (map: FieldErrors<typeof blank>) => {
    setErr((p) => ({ ...p, ...map }));
    return Object.values(map).some(Boolean) ? "Fix the highlighted fields to continue." : undefined;
  };

  const steps: WizardStep[] = [
    {
      title: "Customer & property",
      summary: "Who is visiting, and which parcel they want to see.",
      validate: () =>
        check({
          customerId: f.customerId ? undefined : "Select a customer.",
          projectId: f.projectId ? undefined : "Select a project.",
        }),
      content: (
        <>
          <Field label="Customer" required error={err.customerId}>
            <SelectInput
              value={f.customerId}
              onChange={(v) => set("customerId", v)}
              placeholder="Select customer"
              invalid={!!err.customerId}
              options={customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.phone}` }))}
            />
          </Field>
          <Field label="Project" required error={err.projectId}>
            <SelectInput
              value={f.projectId}
              onChange={(v) => {
                set("projectId", v);
                set("plotId", "");
              }}
              placeholder="Select project"
              invalid={!!err.projectId}
              options={projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.code}` }))}
            />
          </Field>
          <Field label="Interested plot" hint="Optional — leave blank for a general site walk.">
            <SelectInput
              value={f.plotId}
              onChange={(v) => set("plotId", v)}
              placeholder={f.projectId ? "Any available plot" : "Select a project first"}
              options={interestedPlots.map((p) => ({
                value: p.id,
                label: `${p.number} · ${p.areaSqYd} sq yd · ${p.facing}`,
              }))}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Schedule",
      summary: "When they come, who hosts, and whether pickup is needed.",
      validate: () =>
        check({
          date: f.date ? undefined : "Pick a visit date.",
          time: f.time ? undefined : "Pick a time.",
          agentId: f.agentId ? undefined : "Assign an agent.",
        }),
      content: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date" required error={err.date}>
              <TextInput
                value={f.date}
                onChange={(v) => set("date", v)}
                type="date"
                invalid={!!err.date}
              />
            </Field>
            <Field label="Time" required error={err.time}>
              <TextInput
                value={f.time}
                onChange={(v) => set("time", v)}
                type="time"
                invalid={!!err.time}
              />
            </Field>
          </div>
          <Field label="Assigned agent" required error={err.agentId}>
            <SelectInput
              value={f.agentId}
              onChange={(v) => set("agentId", v)}
              placeholder="Select agent"
              invalid={!!err.agentId}
              options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${a.region}` }))}
            />
          </Field>
          <Field label="Visitors">
            <NumberInput value={f.visitors} onChange={(v) => set("visitors", Math.max(1, v))} />
          </Field>
          <Field label="Pickup">
            <Checkbox
              checked={f.pickup}
              onChange={(v) => set("pickup", v)}
              label="Pickup required"
              hint="Sales team will arrange a vehicle."
            />
          </Field>
        </>
      ),
    },
    {
      title: "Confirm visit",
      summary: "Notes and a last look before the visit is booked.",
      content: (
        <>
          <Field label="Notes">
            <TextareaInput
              value={f.notes}
              onChange={(v) => set("notes", v)}
              rows={2}
              placeholder="Gate instructions, preferences…"
            />
          </Field>
          <ReviewList
            rows={[
              { label: "Customer", value: customer?.name ?? "—", step: 0 },
              { label: "Project", value: project?.name ?? "—", step: 0 },
              {
                label: "Plot",
                value: plots.find((p) => p.id === f.plotId)?.number ?? "General visit",
                step: 0,
              },
              { label: "When", value: `${f.date} · ${f.time}`, step: 1 },
              {
                label: "Agent",
                value: agents.find((a) => a.id === f.agentId)?.name ?? "—",
                step: 1,
              },
              { label: "Visitors", value: String(f.visitors), step: 1 },
              { label: "Pickup", value: f.pickup ? "Required" : "Not required", step: 1 },
            ]}
          />
        </>
      ),
    },
  ];

  const complete = () => {
    const id = nextId("VIS-", siteVisits.length ? siteVisits : [{ id: "VIS-000" }]);
    const visit: SiteVisit = {
      id,
      customerId: f.customerId,
      projectId: f.projectId,
      plotIds: f.plotId ? [f.plotId] : [],
      date: f.date,
      time: f.time,
      agentId: f.agentId,
      visitors: f.visitors,
      pickup: f.pickup,
      notes: f.notes.trim(),
      status: "Scheduled",
    };
    saveVisit(visit);
    if (customer && customer.stage === "Lead") saveCustomer({ ...customer, stage: "Site visit" });
    clearDraft();
    void navigate({ to: "/customers/$customerId", params: { customerId: f.customerId } });
  };

  return (
    <OnboardingShell
      eyebrow="Sales"
      title="Book a site visit"
      description="Customer, schedule, confirm — the same compact flow as every other record."
      steps={steps}
      onComplete={complete}
      submitLabel="Confirm visit"
      dirty={dirty}
      onDiscard={() => {
        clearDraft();
        void navigate({ to: "/customers" });
      }}
    />
  );
}
