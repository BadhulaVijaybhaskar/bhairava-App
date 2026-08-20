import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader, Panel } from "@/components/kit";
import {
  Checkbox,
  Field,
  MultiSelect,
  NumberInput,
  SelectInput,
  TextInput,
  TextareaInput,
  Wizard,
  type WizardStep,
} from "@/components/form-kit";
import { byId, plots, type SiteVisit, type SiteVisitStatus } from "@/lib/mock-data";
import { useData } from "@/lib/store";

export const Route = createFileRoute("/site-visits/new")({
  head: () => ({ meta: [{ title: "Book Site Visit — Bhairava" }] }),
  component: BookSiteVisit,
});

const statuses: SiteVisitStatus[] = ["Scheduled", "Confirmed", "Completed", "Cancelled", "No-show", "Rescheduled"];

function to12h(hhmm: string) {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr ?? "00"} ${suffix}`;
}

function BookSiteVisit() {
  const navigate = useNavigate();
  const { customers, projects, agents, siteVisits, saveSiteVisit, saveCustomer, nextId } = useData();

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const prefillCustomer = params?.get("customerId") ?? null;
  const prefillProject = params?.get("projectId") ?? null;

  const [customerId, setCustomerId] = useState(
    prefillCustomer && customers.some((c) => c.id === prefillCustomer) ? prefillCustomer : customers[0]?.id ?? "",
  );
  const [projectId, setProjectId] = useState(
    prefillProject && projects.some((p) => p.id === prefillProject) ? prefillProject : projects[0]?.id ?? "",
  );
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("11:30");
  const [status, setStatus] = useState<SiteVisitStatus>("Scheduled");
  const [interestedPlots, setInterestedPlots] = useState<string[]>([]);
  const [visitors, setVisitors] = useState(1);
  const [pickup, setPickup] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [moveStage, setMoveStage] = useState(true);

  const projectPlots = useMemo(
    () =>
      plots
        .filter((p) => p.projectId === projectId)
        .slice(0, 40)
        .map((p) => ({ value: p.number, label: p.number })),
    [projectId],
  );

  const customer = byId(customers, customerId);
  const project = byId(projects, projectId);
  const agent = byId(agents, agentId);

  const dirty = customerId !== (customers[0]?.id ?? "") || interestedPlots.length > 0 || notes.trim() !== "";

  const steps: WizardStep[] = [
    {
      title: "Customer & property",
      summary: "Who is visiting and which project.",
      validate: () =>
        !customerId ? "Select a customer." : !projectId ? "Select a project." : undefined,
      content: (
        <>
          <Field label="Customer" required>
            <SelectInput value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} />
          </Field>
          <Field label="Project" required>
            <SelectInput value={projectId} onChange={setProjectId} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
          </Field>
          <Field label="Interested plots" hint="Optional — plots for the selected project">
            <MultiSelect
              values={interestedPlots}
              onChange={setInterestedPlots}
              options={projectPlots}
              empty="No plots configured for this project yet."
            />
          </Field>
        </>
      ),
    },
    {
      title: "Schedule",
      summary: "Pick a date, time and the assigned agent.",
      validate: () => (!date ? "Pick a visit date." : !time ? "Pick a visit time." : !agentId ? "Assign an agent." : undefined),
      content: (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visit date" required>
              <TextInput value={date} onChange={setDate} type="date" />
            </Field>
            <Field label="Visit time" required>
              <TextInput value={time} onChange={setTime} type="time" />
            </Field>
          </div>
          <Field label="Assigned agent" required>
            <SelectInput value={agentId} onChange={setAgentId} options={agents.map((a) => ({ value: a.id, label: `${a.name} · ${a.region}` }))} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visitors">
              <NumberInput value={visitors} onChange={setVisitors} />
            </Field>
            <div className="flex items-end">
              <Checkbox checked={pickup} onChange={setPickup} label="Pickup required" hint="Arrange transport" />
            </div>
          </div>
          {pickup && (
            <Field label="Pickup location">
              <TextInput value={pickupLocation} onChange={setPickupLocation} placeholder="e.g. Gachibowli metro" />
            </Field>
          )}
        </>
      ),
    },
    {
      title: "Confirm visit",
      summary: "Add notes and review before confirming.",
      content: (
        <>
          <Field label="Status">
            <SelectInput value={status} onChange={setStatus} options={statuses} />
          </Field>
          <Field label="Notes">
            <TextareaInput value={notes} onChange={setNotes} rows={3} placeholder="Context for the site team" />
          </Field>
          <Checkbox
            checked={moveStage}
            onChange={setMoveStage}
            label="Move customer to Site visit stage"
            hint="Only applies while the customer is still a Lead"
          />
          <div className="rounded-xl bg-surface-low p-3.5">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Review</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div><dt className="text-xs text-muted-foreground">Customer</dt><dd className="truncate font-medium">{customer?.name ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Project</dt><dd className="truncate font-medium">{project?.name ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">When</dt><dd className="numeric font-medium">{date} · {to12h(time)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Agent</dt><dd className="truncate font-medium">{agent?.name ?? "—"}</dd></div>
              {interestedPlots.length > 0 && (
                <div className="col-span-2"><dt className="text-xs text-muted-foreground">Plots</dt><dd className="numeric font-medium">{interestedPlots.join(", ")}</dd></div>
              )}
            </dl>
          </div>
        </>
      ),
    },
  ];

  const complete = () => {
    const id = nextId("SV-", siteVisits);
    const visit: SiteVisit = {
      id,
      customerId,
      projectId,
      agentId,
      date,
      time: to12h(time),
      status,
      plotInterest: interestedPlots,
      visitors,
      pickupRequired: pickup,
      notes: notes.trim(),
      ...(pickup && pickupLocation.trim() ? { pickupLocation: pickupLocation.trim() } : {}),
    };
    saveSiteVisit(visit);
    if (moveStage && customer && customer.stage === "Lead") {
      saveCustomer({ ...customer, stage: "Site visit" });
    }
    toast.success("Site visit booked.");
    navigate({ to: "/site-visits" });
  };

  return (
    <AppShell>
      <PageHeader eyebrow="Operations" title="Book Site Visit" description="Schedule a customer visit and assign an agent." />
      <Wizard
        steps={steps}
        onComplete={complete}
        submitLabel="Confirm Site Visit"
        dirty={dirty}
        onDiscard={() => navigate({ to: "/site-visits" })}
        aside={
          <Panel tonal className="text-xs leading-relaxed text-muted-foreground">
            Booking a visit can move the customer into the Site visit stage of the pipeline.
          </Panel>
        }
      />
    </AppShell>
  );
}
