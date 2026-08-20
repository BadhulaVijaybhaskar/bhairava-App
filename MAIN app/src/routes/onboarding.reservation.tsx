import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  OnboardingShell,
  ReviewList,
  useOnboardingDraft,
  type FieldErrors,
  type WizardStep,
} from "@/components/onboarding";
import { Field, NumberInput, SelectInput, TextInput, TextareaInput } from "@/components/form-kit";
import { useData } from "@/lib/store";
import { formatINR, type Reservation } from "@/lib/mock-data";

type Search = { customerId?: string; plotId?: string; projectId?: string };

export const Route = createFileRoute("/onboarding/reservation")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const next: Search = {};
    if (typeof search["customerId"] === "string") next.customerId = search["customerId"];
    if (typeof search["plotId"] === "string") next.plotId = search["plotId"];
    if (typeof search["projectId"] === "string") next.projectId = search["projectId"];
    return next;
  },
  head: () => ({
    meta: [
      { title: "Create a reservation — Bhairava" },
      { name: "description", content: "Hold a plot for a buyer with an expiry and token amount." },
      { property: "og:title", content: "Create a reservation — Bhairava" },
    ],
  }),
  component: CreateReservation,
});

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function CreateReservation() {
  const navigate = useNavigate();
  const preset = Route.useSearch();
  const {
    customers,
    projects,
    plots,
    agents,
    reservations,
    saveReservation,
    savePlot,
    saveCustomer,
    nextId,
  } = useData();

  const blank = {
    customerId:
      preset.customerId && customers.some((c) => c.id === preset.customerId)
        ? preset.customerId
        : "",
    projectId:
      preset.projectId && projects.some((p) => p.id === preset.projectId) ? preset.projectId : "",
    plotId: preset.plotId && plots.some((p) => p.id === preset.plotId) ? preset.plotId : "",
    agentId: agents.find((a) => a.status === "Active")?.id ?? agents[0]?.id ?? "",
    amount: 100000,
    holdDays: 7,
    createdAt: new Date().toISOString().slice(0, 10),
    notes: "",
  };

  const [f, setF, clearDraft] = useOnboardingDraft(`reservation:${preset.customerId ?? ""}`, blank);
  const [err, setErr] = useState<FieldErrors<typeof blank>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };

  const customer = customers.find((c) => c.id === f.customerId);
  const plot = plots.find((p) => p.id === f.plotId);
  const project = projects.find((p) => p.id === (plot?.projectId || f.projectId));
  const holdDays = project?.settings?.reservationDays ?? f.holdDays;
  const expiresAt = addDays(f.createdAt, holdDays);
  const availablePlots = useMemo(
    () =>
      plots.filter((p) => {
        if (f.projectId && p.projectId !== f.projectId) return false;
        return p.status === "available" || p.id === f.plotId;
      }),
    [plots, f.projectId, f.plotId],
  );
  const dirty =
    JSON.stringify({
      ...f,
      customerId: blank.customerId,
      plotId: blank.plotId,
      projectId: blank.projectId,
    }) !== JSON.stringify(blank);

  const check = (map: FieldErrors<typeof blank>) => {
    setErr((p) => ({ ...p, ...map }));
    return Object.values(map).some(Boolean) ? "Fix the highlighted fields to continue." : undefined;
  };

  const steps: WizardStep[] = [
    {
      title: "Customer & plot",
      summary: "Who is holding the plot, and which one.",
      validate: () =>
        check({
          customerId: f.customerId ? undefined : "Select a customer.",
          plotId: f.plotId ? undefined : "Select an available plot.",
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
          <Field label="Project">
            <SelectInput
              value={f.projectId}
              onChange={(v) => {
                set("projectId", v);
                set("plotId", "");
              }}
              placeholder="All projects"
              options={projects.map((p) => ({ value: p.id, label: `${p.name} · ${p.code}` }))}
            />
          </Field>
          <Field label="Plot" required error={err.plotId}>
            <SelectInput
              value={f.plotId}
              onChange={(v) => {
                set("plotId", v);
                const next = plots.find((p) => p.id === v);
                if (next) set("projectId", next.projectId);
              }}
              placeholder="Select available plot"
              invalid={!!err.plotId}
              options={availablePlots.slice(0, 120).map((p) => ({
                value: p.id,
                label: `${p.number} · ${p.areaSqYd} sq yd`,
              }))}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Hold terms",
      summary: "Token amount, expiry and owning agent.",
      validate: () =>
        check({
          amount: f.amount > 0 ? undefined : "Enter a token amount.",
          agentId: f.agentId ? undefined : "Assign an agent.",
        }),
      content: (
        <>
          <Field label="Token amount" required error={err.amount}>
            <NumberInput value={f.amount} onChange={(v) => set("amount", v)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Hold from">
              <TextInput value={f.createdAt} onChange={(v) => set("createdAt", v)} type="date" />
            </Field>
            <Field label="Hold days">
              <NumberInput value={f.holdDays} onChange={(v) => set("holdDays", Math.max(1, v))} />
            </Field>
          </div>
          <Field label="Expires">
            <TextInput value={expiresAt} onChange={() => undefined} readOnly />
          </Field>
          <Field label="Assigned agent" required error={err.agentId}>
            <SelectInput
              value={f.agentId}
              onChange={(v) => set("agentId", v)}
              placeholder="Select agent"
              invalid={!!err.agentId}
              options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${a.region}` }))}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Review",
      summary: "Confirm the hold before it goes live on inventory.",
      content: (
        <>
          <Field label="Notes">
            <TextareaInput
              value={f.notes}
              onChange={(v) => set("notes", v)}
              rows={2}
              placeholder="Optional context"
            />
          </Field>
          <ReviewList
            rows={[
              { label: "Customer", value: customer?.name ?? "—", step: 0 },
              { label: "Plot", value: plot?.number ?? "—", step: 0 },
              { label: "Project", value: project?.name ?? "—", step: 0 },
              { label: "Token", value: formatINR(f.amount), step: 1 },
              { label: "Expires", value: expiresAt, step: 1 },
              {
                label: "Agent",
                value: agents.find((a) => a.id === f.agentId)?.name ?? "—",
                step: 1,
              },
            ]}
          />
        </>
      ),
    },
  ];

  const complete = () => {
    if (!plot) return;
    const id = nextId("RSV-", reservations);
    const reservation: Reservation = {
      id,
      plotId: f.plotId,
      customerId: f.customerId,
      agentId: f.agentId,
      amount: f.amount,
      createdAt: f.createdAt,
      expiresAt,
      state: "Active",
      notes: f.notes.trim(),
    };
    saveReservation(reservation);
    savePlot({ ...plot, status: "reserved", customerId: f.customerId, agentId: f.agentId });
    if (customer && (customer.stage === "Lead" || customer.stage === "Site visit")) {
      saveCustomer({ ...customer, stage: "Reserved" });
    }
    clearDraft();
    void navigate({ to: "/reservations" });
  };

  return (
    <OnboardingShell
      eyebrow="Sales"
      title="Create a reservation"
      description="Hold a plot for a buyer — customer, terms, review."
      steps={steps}
      onComplete={complete}
      submitLabel="Create reservation"
      dirty={dirty}
      onDiscard={() => {
        clearDraft();
        void navigate({ to: "/reservations" });
      }}
    />
  );
}
