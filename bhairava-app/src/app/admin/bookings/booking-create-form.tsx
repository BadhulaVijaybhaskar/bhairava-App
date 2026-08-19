"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { z } from "zod";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { createBooking } from "./actions";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type ProjectOption = { id: string; name: string; code: string };
type PlotOption = {
  id: string;
  projectId: string;
  plotNumber: string;
  totalPrice: number;
  status: string;
};
type PersonOption = { id: string; fullName: string; mobile: string };

const ERRORS: Record<string, string> = {
  required: "Project, plot, customer, and booking date are required.",
  amount: "Enter valid booking amount and discount.",
  date: "Enter a valid booking date.",
  status: "Invalid booking status.",
  plotproject: "Selected plot does not belong to this project.",
  unavailable: "This plot is no longer available.",
  agent: "Selected agent is invalid or inactive.",
  locked: "This plot already has an active booking.",
  failed: "Could not create booking. Try again.",
};

const DRAFT_KEY = "bhairava-booking-wizard-draft";

const STEPS = [
  { id: "inventory", label: "Inventory", blurb: "Pick project & plot" },
  { id: "parties", label: "Parties", blurb: "Customer & agent" },
  { id: "commercials", label: "Commercials", blurb: "Amounts & mode" },
  { id: "review", label: "Review", blurb: "Confirm & create" },
] as const;

type StepId = (typeof STEPS)[number]["id"];

type Draft = {
  projectId: string;
  plotId: string;
  customerId: string;
  agentId: string;
  bookingDate: string;
  bookingStatus: "RESERVED" | "BOOKED";
  bookingAmount: string;
  discount: string;
  paymentMode: string;
  notes: string;
  customerQuery: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(defaults?: { projectId?: string; plotId?: string }): Draft {
  return {
    projectId: defaults?.projectId ?? "",
    plotId: defaults?.plotId ?? "",
    customerId: "",
    agentId: "",
    bookingDate: todayISO(),
    bookingStatus: "BOOKED",
    bookingAmount: "0",
    discount: "0",
    paymentMode: "",
    notes: "",
    customerQuery: "",
  };
}

export function BookingCreateForm({
  projects,
  plots,
  customers,
  agents,
  error,
  defaultProjectId,
  defaultPlotId,
}: {
  projects: ProjectOption[];
  plots: PlotOption[];
  customers: PersonOption[];
  agents: PersonOption[];
  error?: string;
  defaultProjectId?: string;
  defaultPlotId?: string;
}) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => {
    const initialProject =
      defaultProjectId ||
      (defaultPlotId ? plots.find((p) => p.id === defaultPlotId)?.projectId : "") ||
      "";
    return emptyDraft({
      projectId: initialProject,
      plotId: defaultPlotId || "",
    });
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft>;
        setDraft((d) => ({
          ...d,
          ...parsed,
          projectId: defaultProjectId || parsed.projectId || d.projectId,
          plotId: defaultPlotId || parsed.plotId || d.plotId,
        }));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [defaultPlotId, defaultProjectId]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, hydrated]);

  const projectPlots = useMemo(
    () => plots.filter((p) => p.projectId === draft.projectId),
    [plots, draft.projectId],
  );
  const selectedPlot = projectPlots.find((p) => p.id === draft.plotId) ?? null;
  const selectedCustomer = customers.find((c) => c.id === draft.customerId) ?? null;
  const selectedAgent = agents.find((a) => a.id === draft.agentId) ?? null;
  const selectedProject = projects.find((p) => p.id === draft.projectId) ?? null;
  const totalPrice = selectedPlot?.totalPrice ?? 0;
  const discountNum = Number(draft.discount) || 0;
  const finalAmount = Math.max(totalPrice - discountNum, 0);

  const filteredCustomers = useMemo(() => {
    const q = draft.customerQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 40);
    return customers
      .filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) || c.mobile.includes(q),
      )
      .slice(0, 40);
  }, [customers, draft.customerQuery]);

  function patch(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
    setFieldErrors({});
  }

  function validateStep(index: number): boolean {
    const errs: Record<string, string> = {};
    if (index === 0) {
      if (!draft.projectId) errs.projectId = "Select a project.";
      if (!draft.plotId) errs.plotId = "Select a plot.";
    }
    if (index === 1) {
      if (!draft.customerId) errs.customerId = "Select a customer.";
    }
    if (index === 2) {
      const dateOk = z.string().min(1).safeParse(draft.bookingDate).success;
      if (!dateOk) errs.bookingDate = "Enter a booking date.";
      const amount = Number(draft.bookingAmount);
      const discount = Number(draft.discount);
      if (!Number.isFinite(amount) || amount < 0) errs.bookingAmount = "Invalid amount.";
      if (!Number.isFinite(discount) || discount < 0) errs.discount = "Invalid discount.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function submit() {
    if (!validateStep(2) || !validateStep(0) || !validateStep(1)) {
      setStep(0);
      return;
    }
    const fd = new FormData();
    fd.set("projectId", draft.projectId);
    fd.set("plotId", draft.plotId);
    fd.set("customerId", draft.customerId);
    fd.set("agentId", draft.agentId);
    fd.set("bookingDate", draft.bookingDate);
    fd.set("bookingStatus", draft.bookingStatus);
    fd.set("bookingAmount", draft.bookingAmount);
    fd.set("discount", draft.discount);
    fd.set("paymentMode", draft.paymentMode);
    fd.set("notes", draft.notes);
    startTransition(async () => {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      await createBooking(fd);
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "TEXTAREA") return;
      if (step < STEPS.length - 1) {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, draft]);

  const stepId = STEPS[step].id as StepId;

  return (
    <div className="space-y-5">
      {error && ERRORS[error] ? (
        <p className="rounded-xl border border-destructive/30 bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-destructive">
          {ERRORS[error]}
        </p>
      ) : null}

      {/* Progress rail */}
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  if (i < step) setStep(i);
                  else if (i > step) {
                    for (let j = step; j < i; j++) {
                      if (!validateStep(j)) {
                        setStep(j);
                        return;
                      }
                    }
                    setStep(i);
                  }
                }}
                className={cn(
                  "w-full rounded-2xl px-2 py-2 text-left transition",
                  active
                    ? "bg-[#E7EFF6] text-primary"
                    : done
                      ? "bg-card"
                      : "bg-[#EFF4F8]",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                      active || done
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  <span className="truncate text-[12px] font-semibold text-foreground">
                    {s.label}
                  </span>
                </div>
                <p className="mt-1 hidden text-[10px] text-muted-foreground sm:block">
                  {s.blurb}
                </p>
              </button>
            </li>
          );
        })}
      </ol>

      <Card className="overflow-hidden border-none shadow-none">
        <CardContent className="p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepId}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-4 p-5"
            >
              {stepId === "inventory" ? (
                <>
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">Choose inventory</h3>
                    <p className="text-sm text-muted-foreground">
                      Only bookable plots are listed.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {projects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => patch({ projectId: p.id, plotId: "" })}
                          className={cn(
                            "rounded-2xl px-3 py-2.5 text-left transition",
                            draft.projectId === p.id
                              ? "bg-[#E7EFF6] ring-2 ring-primary/20"
                              : "bg-[#EFF4F8] hover:bg-[#E7EFF6]",
                          )}
                        >
                          <p className="text-[13px] font-semibold text-foreground">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.code}</p>
                        </button>
                      ))}
                    </div>
                    {fieldErrors.projectId ? (
                      <p className="text-xs text-destructive">{fieldErrors.projectId}</p>
                    ) : null}
                  </div>

                  {draft.projectId ? (
                    <div className="space-y-2">
                      <Label>Plot</Label>
                      <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                        {projectPlots.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => patch({ plotId: p.id })}
                            className={cn(
                              "rounded-2xl px-3 py-2.5 text-left transition",
                              draft.plotId === p.id
                                ? "bg-[#E7EFF6] ring-2 ring-primary/20"
                                : "bg-[#EFF4F8] hover:bg-[#E7EFF6]",
                            )}
                          >
                            <p className="text-[13px] font-semibold text-foreground">
                              {p.plotNumber}
                            </p>
                            <p className="tabular-nums text-[12px] text-muted-foreground">
                              {formatINR(p.totalPrice)} · {p.status.replaceAll("_", " ")}
                            </p>
                          </button>
                        ))}
                      </div>
                      {fieldErrors.plotId ? (
                        <p className="text-xs text-destructive">{fieldErrors.plotId}</p>
                      ) : null}
                      {selectedPlot ? (
                        <p className="rounded-2xl bg-[#EFF4F8] px-3.5 py-2.5 text-sm font-medium text-primary">
                          Plot price {formatINR(totalPrice)}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}

              {stepId === "parties" ? (
                <>
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">Assign parties</h3>
                    <p className="text-sm text-muted-foreground">
                      Search customers by name or mobile.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Customer</Label>
                      <Link
                        href="/admin/customers/new"
                        className="text-[12px] font-semibold text-primary"
                      >
                        + Create new
                      </Link>
                    </div>
                    <Input
                      value={draft.customerQuery}
                      onChange={(e) => patch({ customerQuery: e.target.value })}
                      placeholder="Search customers…"
                      className="h-9"
                    />
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-[#EFF4F8] p-1">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => patch({ customerId: c.id })}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition",
                            draft.customerId === c.id
                              ? "bg-[#E7EFF6] text-primary"
                              : "hover:bg-muted",
                          )}
                        >
                          <span className="font-semibold">{c.fullName}</span>
                          <span className="text-muted-foreground">{c.mobile}</span>
                        </button>
                      ))}
                      {filteredCustomers.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-muted-foreground">No matches.</p>
                      ) : null}
                    </div>
                    {fieldErrors.customerId ? (
                      <p className="text-xs text-destructive">{fieldErrors.customerId}</p>
                    ) : null}
                  </div>
                  <div className="space-y-2">
                    <Label>Agent (optional)</Label>
                    <select
                      value={draft.agentId}
                      onChange={(e) => patch({ agentId: e.target.value })}
                      className="input-field !pl-3"
                    >
                      <option value="">No agent</option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullName} · {a.mobile}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              {stepId === "commercials" ? (
                <>
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">Commercials</h3>
                    <p className="text-sm text-muted-foreground">
                      Final amount updates live from plot price − discount.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="bookingDate">Booking date</Label>
                      <Input
                        id="bookingDate"
                        type="date"
                        value={draft.bookingDate}
                        onChange={(e) => patch({ bookingDate: e.target.value })}
                        className="h-9"
                      />
                      {fieldErrors.bookingDate ? (
                        <p className="text-xs text-destructive">{fieldErrors.bookingDate}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Initial status</Label>
                      <select
                        value={draft.bookingStatus}
                        onChange={(e) =>
                          patch({
                            bookingStatus: e.target.value as "RESERVED" | "BOOKED",
                          })
                        }
                        className="input-field !pl-3"
                      >
                        <option value="RESERVED">Reserved</option>
                        <option value="BOOKED">Booked</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bookingAmount">Booking amount (token)</Label>
                      <Input
                        id="bookingAmount"
                        type="number"
                        min={0}
                        value={draft.bookingAmount}
                        onChange={(e) => patch({ bookingAmount: e.target.value })}
                        className="h-9 tabular-nums"
                      />
                      {fieldErrors.bookingAmount ? (
                        <p className="text-xs text-destructive">{fieldErrors.bookingAmount}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="discount">Discount</Label>
                      <Input
                        id="discount"
                        type="number"
                        min={0}
                        value={draft.discount}
                        onChange={(e) => patch({ discount: e.target.value })}
                        className="h-9 tabular-nums"
                      />
                      {fieldErrors.discount ? (
                        <p className="text-xs text-destructive">{fieldErrors.discount}</p>
                      ) : null}
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Payment mode</Label>
                      <select
                        value={draft.paymentMode}
                        onChange={(e) => patch({ paymentMode: e.target.value })}
                        className="input-field !pl-3"
                      >
                        <option value="">Not recorded</option>
                        <option value="CASH">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="NEFT">NEFT</option>
                        <option value="RTGS">RTGS</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="CARD">Card</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        rows={3}
                        value={draft.notes}
                        onChange={(e) => patch({ notes: e.target.value })}
                        placeholder="Optional booking notes"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded-xl bg-[#EFF4F8] p-3.5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Plot price
                      </p>
                      <p className="mt-1 tabular-nums text-lg font-bold text-foreground">
                        {formatINR(totalPrice)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Final amount
                      </p>
                      <p className="mt-1 tabular-nums text-lg font-bold text-primary">
                        {formatINR(finalAmount)}
                      </p>
                    </div>
                  </div>
                </>
              ) : null}

              {stepId === "review" ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-[#EFF4F8] text-primary">
                      <PartyPopper className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-semibold text-foreground">
                        Review & confirm
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Creating will lock the plot and start the booking timeline.
                      </p>
                    </div>
                  </div>
                  <dl className="space-y-2.5 rounded-2xl bg-[#EFF4F8] p-4 text-[13px]">
                    <ReviewRow
                      label="Project"
                      onEdit={() => setStep(0)}
                      value={selectedProject ? `${selectedProject.name} (${selectedProject.code})` : "—"}
                    />
                    <ReviewRow
                      label="Plot"
                      onEdit={() => setStep(0)}
                      value={
                        selectedPlot
                          ? `${selectedPlot.plotNumber} · ${formatINR(selectedPlot.totalPrice)}`
                          : "—"
                      }
                    />
                    <ReviewRow
                      label="Customer"
                      onEdit={() => setStep(1)}
                      value={
                        selectedCustomer
                          ? `${selectedCustomer.fullName} · ${selectedCustomer.mobile}`
                          : "—"
                      }
                    />
                    <ReviewRow
                      label="Agent"
                      onEdit={() => setStep(1)}
                      value={selectedAgent?.fullName ?? "None"}
                    />
                    <ReviewRow
                      label="Date / status"
                      onEdit={() => setStep(2)}
                      value={`${draft.bookingDate} · ${draft.bookingStatus}`}
                    />
                    <ReviewRow
                      label="Token / discount"
                      onEdit={() => setStep(2)}
                      value={`${formatINR(Number(draft.bookingAmount) || 0)} / ${formatINR(discountNum)}`}
                    />
                    <ReviewRow
                      label="Final amount"
                      onEdit={() => setStep(2)}
                      value={formatINR(finalAmount)}
                    />
                    {draft.notes ? (
                      <ReviewRow label="Notes" onEdit={() => setStep(2)} value={draft.notes} />
                    ) : null}
                  </dl>
                </>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-9"
          onClick={goBack}
          disabled={step === 0 || pending}
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" className="h-9" onClick={goNext}>
            Continue
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button type="button" className="h-9 min-w-[140px]" onClick={submit} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create booking"
            )}
          </Button>
        )}
      </div>
      <p className="text-center text-[11px] text-muted-foreground">
        Press Enter to continue · draft autosaved in this browser
      </p>
    </div>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[12px] font-semibold text-primary hover:underline"
      >
        Edit
      </button>
    </div>
  );
}
