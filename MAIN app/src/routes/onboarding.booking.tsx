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
import { byId, formatINR, type Booking } from "@/lib/mock-data";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/onboarding/booking")({
  head: () => ({ meta: [{ title: "New booking — Bhairava" }] }),
  component: NewBooking,
});

const STAGES = ["Draft", "Confirmed", "Agreement", "Registered"] as const;

function NewBooking() {
  const navigate = useNavigate();
  const { customers, projects, plots, agents, bookings, saveBooking, savePlot, saveCustomer, nextId } = useData();

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const prefillCustomer = params?.get("customerId") ?? "";
  const prefillProject = params?.get("projectId") ?? "";
  const prefillPlot = params?.get("plotId") ?? "";

  const [customerId, setCustomerId] = useState(
    prefillCustomer && customers.some((c) => c.id === prefillCustomer) ? prefillCustomer : customers[0]?.id ?? "",
  );
  const [projectId, setProjectId] = useState(
    prefillProject && projects.some((p) => p.id === prefillProject) ? prefillProject : projects[0]?.id ?? "",
  );
  const [plotId, setPlotId] = useState(prefillPlot);
  const [agentId, setAgentId] = useState(agents.find((a) => a.status === "Active")?.id ?? agents[0]?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [stage, setStage] = useState<(typeof STAGES)[number]>("Confirmed");
  const [amountTouched, setAmountTouched] = useState(false);

  const customer = byId(customers, customerId);
  const project = byId(projects, projectId);
  const plot = byId(plots, plotId);
  const agent = byId(agents, agentId);

  const bookablePlots = useMemo(
    () => plots.filter((p) => p.projectId === projectId && (p.status === "available" || p.status === "reserved")),
    [plots, projectId],
  );

  const suggestedAmount = plot ? plot.areaSqYd * plot.pricePerSqYd : 0;
  const displayAmount = amountTouched ? amount : suggestedAmount;
  const dirty = plotId !== "" || paid > 0;

  const setProject = (id: string) => {
    setProjectId(id);
    setPlotId("");
    setAmountTouched(false);
  };

  const setPlot = (id: string) => {
    setPlotId(id);
    setAmountTouched(false);
    const next = byId(plots, id);
    if (next?.agentId) setAgentId(next.agentId);
    else if (customer?.agentId) setAgentId(customer.agentId);
  };

  const steps: WizardStep[] = [
    {
      title: "Customer",
      summary: "Who is booking the plot.",
      validate: () => (!customerId ? "Select a customer." : undefined),
      content: (
        <Field label="Customer" required>
          <SelectInput
            value={customerId}
            onChange={setCustomerId}
            options={customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.stage}` }))}
          />
        </Field>
      ),
    },
    {
      title: "Plot",
      summary: "Project and an available or reserved plot.",
      validate: () =>
        !projectId ? "Select a project." : !plotId ? "Select a plot." : bookablePlots.length === 0 ? "No bookable plots in this project." : undefined,
      content: (
        <>
          <Field label="Project" required>
            <SelectInput
              value={projectId}
              onChange={setProject}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label="Plot" required hint={bookablePlots.length ? `${bookablePlots.length} bookable` : "None available"}>
            <SelectInput
              value={plotId}
              onChange={setPlot}
              options={[
                { value: "", label: bookablePlots.length ? "Select a plot" : "No bookable plots" },
                ...bookablePlots.map((p) => ({
                  value: p.id,
                  label: `${p.number} · ${p.areaSqYd} sq.yd · ${p.status}`,
                })),
              ]}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Commercial",
      summary: "Ticket size, token collected and booking date.",
      validate: () =>
        displayAmount < 1
          ? "Enter a booking amount."
          : paid < 0
            ? "Paid cannot be negative."
            : paid > displayAmount
              ? "Paid cannot exceed the booking amount."
              : !agentId
                ? "Assign an agent."
                : !date
                  ? "Pick a booking date."
                  : undefined,
      content: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" required hint={suggestedAmount ? `Plot value ${formatINR(suggestedAmount, { compact: true })}` : undefined}>
              <NumberInput
                value={displayAmount}
                onChange={(v) => {
                  setAmountTouched(true);
                  setAmount(v);
                }}
              />
            </Field>
            <Field label="Paid now">
              <NumberInput value={paid} onChange={setPaid} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Booking date" required>
              <TextInput value={date} onChange={setDate} type="date" />
            </Field>
            <Field label="Agent" required>
              <SelectInput
                value={agentId}
                onChange={setAgentId}
                options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${a.region}` }))}
              />
            </Field>
          </div>
        </>
      ),
    },
    {
      title: "Review",
      summary: "Confirm stage and create the booking.",
      content: (
        <>
          <Field label="Stage">
            <SelectInput value={stage} onChange={setStage} options={STAGES} />
          </Field>
          <div className="rounded-xl bg-surface-low p-3.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Summary</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Customer</dt>
                <dd className="truncate font-medium">{customer?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Plot</dt>
                <dd className="numeric font-medium">{plot?.number ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Project</dt>
                <dd className="truncate font-medium">{project?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Agent</dt>
                <dd className="truncate font-medium">{agent?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Amount</dt>
                <dd className="numeric font-medium">{formatINR(displayAmount, { compact: true })}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Paid</dt>
                <dd className="numeric font-medium">{formatINR(paid, { compact: true })}</dd>
              </div>
            </dl>
          </div>
        </>
      ),
    },
  ];

  const complete = () => {
    if (!plot || !customer) return;
    const id = nextId("BKG-", bookings);
    const booking: Booking = {
      id,
      customerId,
      plotId,
      projectId,
      agentId,
      amount: displayAmount,
      paid,
      date,
      stage,
    };
    saveBooking(booking);
    savePlot({
      ...plot,
      status: stage === "Registered" ? "registered" : "booked",
      customerId,
      agentId,
    });
    saveCustomer({
      ...customer,
      stage: stage === "Registered" ? "Registered" : "Booked",
      plots: customer.plots.includes(plot.id) ? customer.plots : [plot.id, ...customer.plots],
      totalValue: customer.totalValue + displayAmount,
      paid: customer.paid + paid,
      agentId: customer.agentId || agentId,
    });
    toast.success("Booking created");
    void navigate({ to: "/bookings/$bookingId", params: { bookingId: id } });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales"
        title="New booking"
        description="Four short steps. The plot moves to Booked when you confirm."
      />
      <Wizard
        steps={steps}
        onComplete={complete}
        submitLabel="Create Booking"
        dirty={dirty}
        onDiscard={() => void navigate({ to: "/bookings" })}
        aside={
          <Panel tonal className="text-xs leading-relaxed text-muted-foreground">
            Only Available and Reserved plots can be booked. The customer pipeline moves to Booked.
          </Panel>
        }
      />
    </AppShell>
  );
}
