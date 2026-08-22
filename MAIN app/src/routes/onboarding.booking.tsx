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
import { formatINR, type Booking, type Payment } from "@/lib/mock-data";

const MODES: Payment["mode"][] = ["UPI", "NEFT", "Cheque", "Cash", "Card"];

type Search = { customerId?: string; plotId?: string; projectId?: string };

export const Route = createFileRoute("/onboarding/booking")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const next: Search = {};
    if (typeof search["customerId"] === "string") next.customerId = search["customerId"];
    if (typeof search["plotId"] === "string") next.plotId = search["plotId"];
    if (typeof search["projectId"] === "string") next.projectId = search["projectId"];
    return next;
  },
  head: () => ({
    meta: [
      { title: "Create a booking — Bhairava" },
      {
        name: "description",
        content: "Book a plot: customer, pricing, payment and a final review.",
      },
      { property: "og:title", content: "Create a booking — Bhairava" },
    ],
  }),
  component: CreateBooking,
});

function CreateBooking() {
  const navigate = useNavigate();
  const preset = Route.useSearch();
  const {
    customers,
    projects,
    plots,
    agents,
    bookings,
    saveBooking,
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
    discountPct: 0,
    paid: 0,
    paymentMode: "UPI" as Payment["mode"],
    reference: "",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  };

  const [f, setF, clearDraft] = useOnboardingDraft(`booking:${preset.customerId ?? ""}`, blank);
  const [err, setErr] = useState<FieldErrors<typeof blank>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: undefined }));
  };

  const customer = customers.find((c) => c.id === f.customerId);
  const plot = plots.find((p) => p.id === f.plotId);
  const project = projects.find((p) => p.id === (plot?.projectId || f.projectId));
  const availablePlots = useMemo(
    () =>
      plots.filter((p) => {
        if (f.projectId && p.projectId !== f.projectId) return false;
        return p.status === "available" || p.status === "reserved" || p.id === f.plotId;
      }),
    [plots, f.projectId, f.plotId],
  );
  const gross = plot ? plot.areaSqYd * plot.pricePerSqYd : 0;
  const amount = Math.round(gross * (1 - f.discountPct / 100));
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
      summary: "The buyer and the inventory being booked.",
      validate: () =>
        check({
          customerId: f.customerId ? undefined : "Select a customer.",
          plotId: f.plotId ? undefined : "Select a plot.",
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
              placeholder="Select plot"
              invalid={!!err.plotId}
              options={availablePlots.slice(0, 120).map((p) => ({
                value: p.id,
                label: `${p.number} · ${p.areaSqYd} sq yd · ${p.status}`,
              }))}
            />
          </Field>
          <Field label="Assigned agent">
            <SelectInput
              value={f.agentId}
              onChange={(v) => set("agentId", v)}
              options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${a.region}` }))}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Pricing",
      summary: "Rate, discount and the amount this booking will lock.",
      validate: () =>
        check({ plotId: amount > 0 ? undefined : "Select a plot with a valid price." }),
      content: (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Area">
              <TextInput
                value={plot ? `${plot.areaSqYd} sq yd` : "—"}
                onChange={() => undefined}
                readOnly
              />
            </Field>
            <Field label="Rate / sq yd">
              <TextInput
                value={plot ? `₹${plot.pricePerSqYd.toLocaleString("en-IN")}` : "—"}
                onChange={() => undefined}
                readOnly
              />
            </Field>
          </div>
          <Field label="Discount %">
            <NumberInput
              value={f.discountPct}
              onChange={(v) => set("discountPct", Math.min(25, Math.max(0, v)))}
            />
          </Field>
          <div className="rounded-xl bg-surface-low px-3.5 py-3">
            <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              Booking value
            </p>
            <p className="numeric pt-1 text-xl font-semibold">{formatINR(amount)}</p>
          </div>
        </>
      ),
    },
    {
      title: "Payment & documentation",
      summary: "Advance collected against this booking.",
      validate: () =>
        check({
          paid:
            f.paid >= 0 && f.paid <= amount
              ? undefined
              : "Advance cannot exceed the booking value.",
        }),
      content: (
        <>
          <Field label="Advance paid" required error={err.paid}>
            <NumberInput value={f.paid} onChange={(v) => set("paid", Math.max(0, v))} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Payment mode">
              <SelectInput
                value={f.paymentMode}
                onChange={(v) => set("paymentMode", v)}
                options={MODES}
              />
            </Field>
            <Field label="Reference">
              <TextInput
                value={f.reference}
                onChange={(v) => set("reference", v)}
                placeholder="UPI / cheque no."
              />
            </Field>
          </div>
          <Field label="Notes">
            <TextareaInput
              value={f.notes}
              onChange={(v) => set("notes", v)}
              rows={2}
              placeholder="Agreement status, special terms"
            />
          </Field>
        </>
      ),
    },
    {
      title: "Review & confirm",
      summary: "A last look before the booking is created.",
      content: (
        <>
          <Field label="Booking date">
            <TextInput value={f.date} onChange={(v) => set("date", v)} type="date" />
          </Field>
          <ReviewList
            rows={[
              { label: "Customer", value: customer?.name ?? "—", step: 0 },
              { label: "Plot", value: plot?.number ?? "—", step: 0 },
              { label: "Project", value: project?.name ?? "—", step: 0 },
              {
                label: "Agent",
                value: agents.find((a) => a.id === f.agentId)?.name ?? "—",
                step: 0,
              },
              { label: "Amount", value: formatINR(amount), step: 1 },
              { label: "Discount", value: `${f.discountPct}%`, step: 1 },
              { label: "Advance", value: formatINR(f.paid), step: 2 },
              { label: "Mode", value: f.paymentMode, step: 2 },
            ]}
          />
        </>
      ),
    },
  ];

  const complete = () => {
    if (!plot) return;
    const id = nextId("BKG-", bookings);
    const booking: Booking = {
      id,
      customerId: f.customerId,
      plotId: f.plotId,
      projectId: plot.projectId,
      agentId: f.agentId,
      amount,
      paid: f.paid,
      date: f.date,
      stage: f.paid > 0 ? "Confirmed" : "Draft",
      notes: f.notes.trim(),
      paymentMode: f.paymentMode,
    };
    saveBooking(booking);
    savePlot({ ...plot, status: "booked", customerId: f.customerId, agentId: f.agentId });
    if (customer) {
      saveCustomer({
        ...customer,
        stage: "Booked",
        plots: customer.plots.includes(plot.id) ? customer.plots : [...customer.plots, plot.id],
        totalValue: customer.totalValue + amount,
        paid: customer.paid + f.paid,
      });
    }
    clearDraft();
    void navigate({ to: "/bookings/$bookingId", params: { bookingId: id } });
  };

  return (
    <OnboardingShell
      eyebrow="Sales"
      title="Create a booking"
      description="Customer and plot, pricing, payment, then a review before the booking is locked."
      steps={steps}
      onComplete={complete}
      submitLabel="Create booking"
      dirty={dirty}
      onDiscard={() => {
        clearDraft();
        void navigate({ to: "/bookings" });
      }}
    />
  );
}
