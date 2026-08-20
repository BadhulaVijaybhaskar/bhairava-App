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
import { byId, formatINR, type Reservation } from "@/lib/mock-data";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/onboarding/reservation")({
  head: () => ({ meta: [{ title: "New reservation — Bhairava" }] }),
  component: NewReservation,
});

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function NewReservation() {
  const navigate = useNavigate();
  const { customers, projects, plots, agents, reservations, saveReservation, savePlot, saveCustomer, nextId } =
    useData();

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
  const [amount, setAmount] = useState(100000);
  const today = new Date().toISOString().slice(0, 10);
  const [expiresAt, setExpiresAt] = useState(addDays(today, 7));

  const customer = byId(customers, customerId);
  const project = byId(projects, projectId);
  const plot = byId(plots, plotId);
  const agent = byId(agents, agentId);

  const holdDays = project?.settings?.reservationDays ?? 7;
  const availablePlots = useMemo(
    () => plots.filter((p) => p.projectId === projectId && p.status === "available"),
    [plots, projectId],
  );

  const dirty = plotId !== "" || amount !== 100000;

  const setProject = (id: string) => {
    setProjectId(id);
    setPlotId("");
    const next = byId(projects, id);
    setExpiresAt(addDays(today, next?.settings?.reservationDays ?? 7));
  };

  const steps: WizardStep[] = [
    {
      title: "Hold",
      summary: "Customer and the plot to reserve.",
      validate: () =>
        !customerId
          ? "Select a customer."
          : !projectId
            ? "Select a project."
            : !plotId
              ? "Select an available plot."
              : availablePlots.length === 0
                ? "No available plots in this project."
                : undefined,
      content: (
        <>
          <Field label="Customer" required>
            <SelectInput
              value={customerId}
              onChange={setCustomerId}
              options={customers.map((c) => ({ value: c.id, label: `${c.name} · ${c.stage}` }))}
            />
          </Field>
          <Field label="Project" required>
            <SelectInput
              value={projectId}
              onChange={setProject}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
          <Field label="Plot" required hint={availablePlots.length ? `${availablePlots.length} available` : "None available"}>
            <SelectInput
              value={plotId}
              onChange={setPlotId}
              options={[
                { value: "", label: availablePlots.length ? "Select a plot" : "No available plots" },
                ...availablePlots.slice(0, 80).map((p) => ({
                  value: p.id,
                  label: `${p.number} · ${p.areaSqYd} sq.yd`,
                })),
              ]}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Terms",
      summary: "Token amount, expiry and owning agent.",
      validate: () =>
        amount < 1
          ? "Enter a hold amount."
          : !expiresAt
            ? "Pick an expiry date."
            : expiresAt < today
              ? "Expiry cannot be in the past."
              : !agentId
                ? "Assign an agent."
                : undefined,
      content: (
        <>
          <Field label="Hold amount" required hint={`Typical token · ${holdDays} day hold`}>
            <NumberInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="Expires" required>
            <TextInput value={expiresAt} onChange={setExpiresAt} type="date" />
          </Field>
          <Field label="Agent" required>
            <SelectInput
              value={agentId}
              onChange={setAgentId}
              options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${a.region}` }))}
            />
          </Field>
        </>
      ),
    },
    {
      title: "Review",
      summary: "Confirm the hold, then create the reservation.",
      content: (
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
              <dt className="text-xs text-muted-foreground">Token</dt>
              <dd className="numeric font-medium">{formatINR(amount, { compact: true })}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Expires</dt>
              <dd className="numeric font-medium">{expiresAt}</dd>
            </div>
          </dl>
        </div>
      ),
    },
  ];

  const complete = () => {
    if (!plot || !customer) return;
    const id = nextId("RSV-", reservations);
    const reservation: Reservation = {
      id,
      plotId,
      customerId,
      agentId,
      amount,
      createdAt: today,
      expiresAt,
      state: expiresAt === today ? "Expiring today" : "Active",
    };
    saveReservation(reservation);
    savePlot({ ...plot, status: "reserved", customerId, agentId });
    if (customer.stage === "Lead" || customer.stage === "Site visit") {
      saveCustomer({
        ...customer,
        stage: "Reserved",
        plots: customer.plots.includes(plot.id) ? customer.plots : [plot.id, ...customer.plots],
        agentId: customer.agentId || agentId,
      });
    }
    toast.success("Reservation created");
    void navigate({ to: "/reservations" });
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Sales"
        title="New reservation"
        description="Hold a plot while the customer decides. Converts later into a booking."
      />
      <Wizard
        steps={steps}
        onComplete={complete}
        submitLabel="Create Reservation"
        dirty={dirty}
        onDiscard={() => void navigate({ to: "/reservations" })}
        aside={
          <Panel tonal className="text-xs leading-relaxed text-muted-foreground">
            A reservation marks the plot Reserved and can move a lead into the Reserved stage.
          </Panel>
        }
      />
    </AppShell>
  );
}
