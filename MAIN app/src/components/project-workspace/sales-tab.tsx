import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Users,
  UserPlus,
  Handshake,
  MapPin,
  Bookmark,
  FileCheck2,
  Plus,
  LayoutDashboard,
} from "lucide-react";
import { Btn, Chip, FilterBar, Panel, SectionTitle } from "@/components/kit";
import {
  Field,
  TextInput,
  SelectInput,
  NumberInput,
  TextareaInput,
  EditSheet,
} from "@/components/form-kit";
import type {
  Agent,
  Booking,
  Customer,
  Lead,
  LeadStage,
  Plot,
  Project,
  Reservation,
  SiteVisit,
  SiteVisitStatus,
} from "@/lib/mock-data";
import { byId, formatINR } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import {
  salesAccessForRole,
  canEditSalesOps,
  type SalesAccess,
} from "@/lib/domain/project-permissions";
import {
  toCanonicalPlotStatus,
  toLegacyPlotStatus,
  PLOT_STATUS_LABEL,
} from "@/lib/domain/plot-status";
import { applyStatusTransition } from "@/lib/domain/plot-transitions";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABEL,
  addHoursIso,
  applyReservationExpiry,
  canApproveCancellation,
  canAgentOnboardCustomer,
  canMutateSalesMaster,
  canRequestCancellation,
  canReservePlot,
  convertLeadToCustomer,
  createBookingAtomic,
  createLeadDraft,
  DEFAULT_RESERVATION_HOURS,
  deriveSalesDashboard,
  evaluateReservationState,
  extendReservation,
  newCancelRequest,
  projectCustomerForSalesRole,
  projectLeadForSalesRole,
  releaseReservationToAvailable,
  toCanonicalSiteVisitStatus,
  transitionLeadStage,
  type CancelRequest,
} from "@/lib/domain/sales";

const SECTIONS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "leads", label: "Leads", icon: UserPlus },
  { key: "customers", label: "Customers", icon: Users },
  { key: "agents", label: "Agents", icon: Handshake },
  { key: "visits", label: "Site Visits", icon: MapPin },
  { key: "reservations", label: "Reservations", icon: Bookmark },
  { key: "bookings", label: "Bookings", icon: FileCheck2 },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

type DetailTarget =
  | { kind: "lead"; id: string }
  | { kind: "customer"; id: string }
  | { kind: "agent"; id: string }
  | { kind: "visit"; id: string }
  | { kind: "reservation"; id: string }
  | { kind: "booking"; id: string }
  | null;

function AccessDenied() {
  return (
    <Panel className="text-center">
      <SectionTitle>Sales access denied</SectionTitle>
      <p className="pt-2 text-sm text-muted-foreground">
        Customer roles cannot open project Sales in MAIN.
      </p>
    </Panel>
  );
}


export function ProjectSalesTab({
  project,
  plots,
}: {
  project: Project;
  plots: Plot[];
}) {
  const session = getSession();
  const access: SalesAccess = salesAccessForRole(session?.role);
  if (access === "denied") return <AccessDenied />;

  const canEdit = canEditSalesOps(session?.role) && access === "full";
  const canOnboard = canAgentOnboardCustomer(session?.role);
  const actorId = session?.email ?? "admin";
  const data = useData();
  const {
    customers, agents, leads, bookings, reservations, siteVisits, cancelRequests,
    saveCustomer, saveLead, saveBooking, saveReservation, saveVisit, savePlot,
    saveAgent, saveCancelRequest, refreshReservationExpiry, nextId,
  } = data;

  const [section, setSection] = useState<SectionKey>("dashboard");
  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<DetailTarget>(null);
  const [filterStage, setFilterStage] = useState("ALL");
  const [filterAgent, setFilterAgent] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    refreshReservationExpiry();
  }, [section, refreshReservationExpiry]);

  const plotIds = useMemo(() => new Set(plots.map((p) => p.id)), [plots]);
  const assignedAgentIds = useMemo(
    () => new Set((project.agents ?? []).concat(agents.filter((a) => a.projects.includes(project.id)).map((a) => a.id))),
    [project.agents, agents, project.id],
  );
  const projectBookings = useMemo(() => bookings.filter((b) => b.projectId === project.id), [bookings, project.id]);
  const projectReservations = useMemo(() => {
    const list = reservations.filter((r) => {
      const plot = byId(plots, r.plotId);
      return plot?.projectId === project.id || plotIds.has(r.plotId);
    });
    return applyReservationExpiry(list);
  }, [reservations, plots, plotIds, project.id]);
  const projectVisits = useMemo(() => siteVisits.filter((v) => v.projectId === project.id), [siteVisits, project.id]);
  const projectLeads = useMemo(() => leads.filter((l) => l.interestedProjectIds.includes(project.id)), [leads, project.id]);
  const relatedCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const p of plots) if (p.customerId) ids.add(p.customerId);
    for (const b of projectBookings) ids.add(b.customerId);
    for (const r of projectReservations) ids.add(r.customerId);
    for (const v of projectVisits) if (v.customerId) ids.add(v.customerId);
    for (const l of projectLeads) if (l.convertedCustomerId) ids.add(l.convertedCustomerId);
    return ids;
  }, [plots, projectBookings, projectReservations, projectVisits, projectLeads]);
  const projectCustomers = useMemo(
    () => customers.filter((c) => relatedCustomerIds.has(c.id) || c.plots.some((pid) => plotIds.has(pid)) || (c.interestedProjectIds ?? []).includes(project.id)),
    [customers, relatedCustomerIds, plotIds, project.id],
  );
  const projectAgents = useMemo(
    () => agents.filter((a) => assignedAgentIds.has(a.id) || a.projects.includes(project.id)),
    [agents, assignedAgentIds, project.id],
  );
  const sessionAgentId = useMemo(() => {
    const email = (session?.email ?? "").toLowerCase();
    return agents.find((a) => (a.email ?? "").toLowerCase() === email)?.id ?? null;
  }, [agents, session?.email]);
  const allAgentsAccess = !!sessionAgentId && !!byId(agents, sessionAgentId)?.allAgentsAccess;
  const piiCtx = { role: session?.role, agentId: sessionAgentId, allAgentsAccess };
  const dashboard = useMemo(
    () => deriveSalesDashboard({ leads: projectLeads, siteVisits: projectVisits, reservations: projectReservations, bookings: projectBookings, projectId: project.id }),
    [projectLeads, projectVisits, projectReservations, projectBookings, project.id],
  );
  const q = query.trim().toLowerCase();
  const showFlash = (msg: string) => { setFlash(msg); window.setTimeout(() => setFlash(null), 3500); };
  const pendingCancels = cancelRequests.filter((c) => c.status === "PENDING");

  const filteredLeads = projectLeads.map((l) => projectLeadForSalesRole(l, piiCtx)).filter((l) => {
    if (filterStage !== "ALL" && l.stage !== filterStage) return false;
    if (filterAgent !== "ALL" && l.assignedAgentId !== filterAgent) return false;
    if (!q) return true;
    return `${l.name} ${l.mobile} ${l.email ?? ""} ${l.source} ${l.stage}`.toLowerCase().includes(q);
  });
  const filteredCustomers = projectCustomers.map((c) => ({ raw: c, view: projectCustomerForSalesRole(c, piiCtx) })).filter(({ raw, view }) => {
    if (filterAgent !== "ALL" && raw.agentId !== filterAgent) return false;
    if (filterStatus !== "ALL" && raw.stage !== filterStatus) return false;
    if (!q) return true;
    return `${view.name ?? ""} ${view.phone ?? ""} ${view.stage ?? ""}`.toLowerCase().includes(q);
  });
  const filteredVisits = projectVisits.filter((v) => {
    const canon = toCanonicalSiteVisitStatus(v.status);
    if (filterStatus !== "ALL" && canon !== filterStatus) return false;
    if (filterAgent !== "ALL" && v.agentId !== filterAgent) return false;
    if (!q) return true;
    const c = byId(customers, v.customerId);
    const lead = v.leadId ? byId(leads, v.leadId) : undefined;
    return `${v.id} ${c?.name ?? ""} ${lead?.name ?? ""} ${v.status} ${v.date}`.toLowerCase().includes(q);
  });
  const filteredReservations = projectReservations.filter((r) => {
    const st = evaluateReservationState(r);
    if (filterStatus === "active" && !(st === "Active" || st === "Expiring today")) return false;
    if (filterStatus === "expiring" && st !== "Expiring today") return false;
    if (filterStatus === "expired" && st !== "Expired") return false;
    if (filterStatus === "converted" && st !== "Converted") return false;
    if (filterAgent !== "ALL" && r.agentId !== filterAgent) return false;
    if (!q) return true;
    const c = byId(customers, r.customerId);
    const name = c ? projectCustomerForSalesRole(c, piiCtx).name ?? "" : "";
    const p = byId(plots, r.plotId);
    return `${r.id} ${name} ${p?.number ?? ""} ${st}`.toLowerCase().includes(q);
  });
  const filteredBookings = projectBookings.filter((b) => {
    if (filterStatus !== "ALL" && b.stage !== filterStatus && b.bookingStatus !== filterStatus) return false;
    if (filterAgent !== "ALL" && b.agentId !== filterAgent) return false;
    if (!q) return true;
    const c = byId(customers, b.customerId);
    const name = c ? projectCustomerForSalesRole(c, piiCtx).name ?? "" : "";
    const p = byId(plots, b.plotId);
    return `${b.id} ${name} ${p?.number ?? ""} ${b.stage}`.toLowerCase().includes(q);
  });


  return (
    <div className="space-y-4" data-testid="sales-workspace">
      {access === "read" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Sales is <span className="font-medium text-foreground">read-only</span> for your role (Finance / Viewer).
        </div>
      )}
      {access === "limited" && (
        <div className="rounded-lg border border-outline-variant/30 bg-surface-low px-3 py-2 text-sm text-muted-foreground">
          Agent sales view — assigned / owned pipeline only; unrelated customer PII is redacted.
        </div>
      )}
      {flash && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm" data-testid="sales-flash">{flash}</div>
      )}

      <Panel className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SectionTitle>Sales workspace</SectionTitle>
            <p className="pt-1 text-sm text-muted-foreground">
              Lead → visit → customer → reservation → booking. Plot status via SALES_FLOW only (no HOLD).
            </p>
          </div>
          {(canEdit || (canOnboard && (section === "leads" || section === "customers" || section === "visits"))) &&
            section !== "dashboard" && section !== "agents" && (
              <Btn variant="primary" onClick={() => setCreateOpen(true)} data-testid="sales-new-btn">
                <Plus className="h-4 w-4" /> New {SECTIONS.find((s) => s.key === section)?.label.replace(/s$/, "") ?? "record"}
              </Btn>
            )}
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-surface-low p-1">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              data-testid={`sales-section-${s.key}`}
              onClick={() => {
                setSection(s.key); setQuery(""); setFilterStage("ALL"); setFilterAgent("ALL"); setFilterStatus("ALL");
                setCreateOpen(false); setDetail(null);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                section === s.key ? "bg-surface-lowest text-foreground shadow-ambient" : "text-muted-foreground hover:bg-surface-c"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />{s.label}
            </button>
          ))}
        </div>
      </Panel>

      {section === "dashboard" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="sales-dashboard">
          {([
            ["Leads", dashboard.leads], ["Qualified", dashboard.qualified], ["Site visits", dashboard.siteVisits],
            ["Active reservations", dashboard.activeReservations], ["Bookings", dashboard.bookings], ["Conversions", dashboard.conversions],
          ] as const).map(([label, value]) => (
            <Panel key={label}>
              <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
              <p className="pt-2 text-2xl font-semibold numeric tabular-nums">{value}</p>
            </Panel>
          ))}
          {pendingCancels.length > 0 && (
            <Panel className="sm:col-span-2 lg:col-span-3">
              <SectionTitle>Cancellation review queue</SectionTitle>
              <ul className="mt-2 space-y-1 text-sm">
                {pendingCancels.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/10 py-2">
                    <span>{c.entityType} <span className="numeric">{c.entityId}</span> — {c.reason}</span>
                    {canApproveCancellation(session?.role) && (
                      <span className="flex gap-2">
                        <Btn variant="primary" onClick={() => {
                          const updated: CancelRequest = { ...c, status: "APPROVED", reviewedBy: actorId, reviewedAt: new Date().toISOString() };
                          saveCancelRequest(updated);
                          if (c.entityType === "reservation") {
                            const r = byId(reservations, c.entityId);
                            const plot = r ? byId(plots, r.plotId) : undefined;
                            if (r && plot) {
                              const res = releaseReservationToAvailable(r, plot, actorId, `Cancel approved: ${c.reason}`);
                              if (!("error" in res)) {
                                saveReservation({ ...res.reservation, cancelRequestStatus: "APPROVED", state: "Cancelled" });
                                savePlot(res.plot);
                              } else {
                                saveReservation({ ...r, cancelRequestStatus: "APPROVED", state: "Cancelled" });
                              }
                            }
                          } else {
                            const b = byId(bookings, c.entityId);
                            if (b) saveBooking({ ...b, stage: "Cancelled", cancelRequestStatus: "APPROVED", cancelReason: c.reason });
                          }
                          showFlash(`Cancellation approved for ${c.entityId}`);
                        }}>Approve</Btn>
                        <Btn onClick={() => {
                          saveCancelRequest({ ...c, status: "REJECTED", reviewedBy: actorId, reviewedAt: new Date().toISOString(), reviewNote: "Rejected" });
                          showFlash(`Cancellation rejected for ${c.entityId}`);
                        }}>Reject</Btn>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      )}

      {section !== "dashboard" && (
        <FilterBar views={["All"]} active="All" onSelect={() => undefined} query={query} onQuery={setQuery} placeholder={`Search ${section}…`} />
      )}

      {section === "leads" && (
        <>
          <div className="flex flex-wrap gap-2">
            <SelectInput value={filterStage} onChange={setFilterStage} options={[{ value: "ALL", label: "All stages" }, ...LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABEL[s] }))]} />
            <SelectInput value={filterAgent} onChange={setFilterAgent} options={[{ value: "ALL", label: "All agents" }, ...projectAgents.map((a) => ({ value: a.id, label: a.name }))]} />
          </div>
          <EntityTable empty="No leads for this project." rows={filteredLeads} onRowClick={(l) => setDetail({ kind: "lead", id: l.id })} columns={[
            { h: "Name", cell: (l: Lead) => l.name },
            { h: "Mobile", cell: (l) => l.mobile },
            { h: "Stage", cell: (l) => <Chip tone="warning">{LEAD_STAGE_LABEL[l.stage]}</Chip> },
            { h: "Source", cell: (l) => l.source },
            { h: "Agent", cell: (l) => byId(agents, l.assignedAgentId)?.name ?? "—" },
            { h: "Follow-up", cell: (l) => l.nextFollowUp ?? "—" },
          ]} />
        </>
      )}

      {section === "customers" && (
        <>
          <div className="flex flex-wrap gap-2">
            <SelectInput value={filterAgent} onChange={setFilterAgent} options={[{ value: "ALL", label: "All agents" }, ...projectAgents.map((a) => ({ value: a.id, label: a.name }))]} />
            <SelectInput value={filterStatus} onChange={setFilterStatus} options={[{ value: "ALL", label: "All stages" }, ...(["Lead", "Site visit", "Reserved", "Booked", "Registered"] as const).map((s) => ({ value: s, label: s }))]} />
          </div>
          <EntityTable empty="No customers related to this project." rows={filteredCustomers} onRowClick={(row) => setDetail({ kind: "customer", id: row.raw.id })} columns={[
            { h: "Name", cell: (row: { raw: Customer; view: ReturnType<typeof projectCustomerForSalesRole> }) => row.view.name ?? "Restricted" },
            { h: "Phone", cell: (row) => row.view.phone ?? "—" },
            { h: "Stage", cell: (row) => <Chip>{row.view.stage ?? "—"}</Chip> },
            { h: "Value", cell: (row) => row.view.redacted && access === "limited" ? "—" : <span className="numeric">{formatINR(row.raw.totalValue, { compact: true })}</span> },
            { h: "Flag", cell: (row) => (row.raw.reviewFlag && row.raw.reviewFlag !== "none" ? <Chip tone="warning">{row.raw.reviewFlag}</Chip> : "—") },
          ]} />
        </>
      )}

      {section === "agents" && (
        <EntityTable empty="No agents assigned to this project." rows={projectAgents.filter((a) => !q || `${a.name} ${a.code} ${a.region}`.toLowerCase().includes(q))} onRowClick={(a) => setDetail({ kind: "agent", id: a.id })} columns={[
          { h: "Agent", cell: (a: Agent) => a.name },
          { h: "Code", cell: (a) => a.code },
          { h: "Region", cell: (a) => a.region },
          { h: "Status", cell: (a) => <Chip tone={a.status === "Active" ? "positive" : "neutral"}>{a.status}</Chip> },
          { h: "All-access", cell: (a) => (a.allAgentsAccess ? "Yes" : "No") },
          { h: "Sales", cell: (a) => <span className="numeric">₹{a.salesCr.toFixed(1)} Cr</span> },
        ]} />
      )}

      {section === "visits" && (
        <>
          <div className="flex flex-wrap gap-2">
            <SelectInput value={filterStatus} onChange={setFilterStatus} options={[
              { value: "ALL", label: "All statuses" }, { value: "SCHEDULED", label: "Scheduled" },
              { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }, { value: "NO_SHOW", label: "No-show" },
            ]} />
            <SelectInput value={filterAgent} onChange={setFilterAgent} options={[{ value: "ALL", label: "All agents" }, ...projectAgents.map((a) => ({ value: a.id, label: a.name }))]} />
          </div>
          <EntityTable empty="No site visits for this project." rows={filteredVisits} onRowClick={(v) => setDetail({ kind: "visit", id: v.id })} columns={[
            { h: "Date", cell: (v: SiteVisit) => `${v.date} ${v.time}` },
            { h: "Who", cell: (v) => v.leadId ? projectLeadForSalesRole(byId(leads, v.leadId) as Lead, piiCtx).name : (byId(customers, v.customerId) ? projectCustomerForSalesRole(byId(customers, v.customerId) as Customer, piiCtx).name : "—") },
            { h: "Agent", cell: (v) => byId(agents, v.agentId)?.name ?? "—" },
            { h: "Status", cell: (v) => <Chip>{toCanonicalSiteVisitStatus(v.status)}</Chip> },
            { h: "Plots", cell: (v) => (v.plotIds?.length ? v.plotIds.length : v.plotInterest?.length ?? 0) },
          ]} />
        </>
      )}

      {section === "reservations" && (
        <>
          <div className="flex flex-wrap gap-2">
            <SelectInput value={filterStatus} onChange={setFilterStatus} options={[
              { value: "ALL", label: "All" }, { value: "active", label: "Active" }, { value: "expiring", label: "Expiring" },
              { value: "expired", label: "Expired" }, { value: "converted", label: "Converted" },
            ]} />
            <SelectInput value={filterAgent} onChange={setFilterAgent} options={[{ value: "ALL", label: "All agents" }, ...projectAgents.map((a) => ({ value: a.id, label: a.name }))]} />
          </div>
          <EntityTable empty="No reservations for this project." rows={filteredReservations} onRowClick={(r) => setDetail({ kind: "reservation", id: r.id })} columns={[
            { h: "ID", cell: (r: Reservation) => <span className="numeric text-xs">{r.id}</span> },
            { h: "Plot", cell: (r) => byId(plots, r.plotId)?.number ?? r.plotId },
            { h: "Customer", cell: (r) => { const c = byId(customers, r.customerId); return c ? projectCustomerForSalesRole(c, piiCtx).name ?? "Restricted" : "—"; } },
            { h: "Amount", cell: (r) => <span className="numeric">{formatINR(r.amount)}</span> },
            { h: "State", cell: (r) => { const st = evaluateReservationState(r); return <Chip tone={st === "Expired" ? "warning" : "info"}>{st}</Chip>; } },
            { h: "Expires", cell: (r) => r.expiresAt.slice(0, 16).replace("T", " ") },
          ]} />
        </>
      )}

      {section === "bookings" && (
        <>
          <div className="flex flex-wrap gap-2">
            <SelectInput value={filterStatus} onChange={setFilterStatus} options={[
              { value: "ALL", label: "All stages" }, { value: "Draft", label: "Draft" }, { value: "Confirmed", label: "Confirmed" },
              { value: "Agreement", label: "Agreement" }, { value: "Registered", label: "Registered" }, { value: "Cancelled", label: "Cancelled" },
            ]} />
            <SelectInput value={filterAgent} onChange={setFilterAgent} options={[{ value: "ALL", label: "All agents" }, ...projectAgents.map((a) => ({ value: a.id, label: a.name }))]} />
          </div>
          <EntityTable empty="No bookings for this project." rows={filteredBookings} onRowClick={(b) => setDetail({ kind: "booking", id: b.id })} columns={[
            { h: "ID", cell: (b: Booking) => <span className="numeric text-xs">{b.bookingNumber ?? b.id}</span> },
            { h: "Plot", cell: (b) => byId(plots, b.plotId)?.number ?? b.plotId },
            { h: "Customer", cell: (b) => { const c = byId(customers, b.customerId); return c ? projectCustomerForSalesRole(c, piiCtx).name ?? "Restricted" : "—"; } },
            { h: "Amount", cell: (b) => <span className="numeric">{formatINR(b.finalAgreedAmount ?? b.amount, { compact: true })}</span> },
            { h: "Stage", cell: (b) => <Chip tone="info">{b.bookingStatus ?? b.stage}</Chip> },
            { h: "Date", cell: (b) => b.date },
          ]} />
        </>
      )}

      {createOpen && (canEdit || canOnboard) && (
        <SalesCreateSheet
          section={section === "dashboard" ? "leads" : section}
          project={project}
          plots={plots}
          customers={projectCustomers.length ? projectCustomers : customers}
          agents={projectAgents.length ? projectAgents : agents}
          leads={projectLeads}
          reservations={projectReservations}
          bookings={bookings}
          nextId={nextId}
          actorId={actorId}
          onClose={() => setCreateOpen(false)}
          onCreateLead={(l) => { saveLead(l); setCreateOpen(false); setSection("leads"); showFlash(`Lead ${l.leadId} created`); setDetail({ kind: "lead", id: l.id }); }}
          onCreateCustomer={(c) => { saveCustomer(c); setCreateOpen(false); setSection("customers"); showFlash(`Customer ${c.id} onboarded`); }}
          onCreateVisit={(v) => {
            saveVisit(v);
            if (v.leadId) {
              const lead = byId(leads, v.leadId);
              if (lead) saveLead(transitionLeadStage(lead, "SITE_VISIT_PLANNED", actorId, `Visit ${v.id}`));
            }
            setCreateOpen(false); setSection("visits"); showFlash(`Site visit ${v.id} scheduled`);
          }}
          onCreateReservation={(r, plot) => {
            const gate = canReservePlot(plot, projectReservations);
            if (!gate.ok) { showFlash(gate.error); return; }
            saveReservation(r);
            const from = toCanonicalPlotStatus(plot.canonicalStatus ?? plot.status);
            const result = applyStatusTransition({ from, to: "RESERVED", reason: `Reservation ${r.id}`, actorId, source: "SALES_FLOW" });
            if (result.ok) {
              savePlot({ ...plot, status: toLegacyPlotStatus(result.to) as Plot["status"], canonicalStatus: result.to, customerId: r.customerId, agentId: r.agentId, statusHistory: [...(plot.statusHistory ?? []), result.entry] });
            }
            setCreateOpen(false); setSection("reservations"); showFlash(`Reservation ${r.id} created`);
          }}
          onCreateBooking={(input, plot, reservationId) => {
            const result = createBookingAtomic({ ...input, actorId, ...(reservationId ? { reservationId } : {}) }, { plot, reservations: projectReservations });
            if (!result.ok) { showFlash(result.error); return; }
            saveBooking(result.booking); savePlot(result.plot);
            if (result.reservation) saveReservation(result.reservation);
            for (const r of result.releasedOther ?? []) saveReservation(r);
            setCreateOpen(false); setSection("bookings"); showFlash(`Booking ${result.booking.id} created atomically`);
          }}
        />
      )}

      {detail && (
        <SalesDetailSheet
          detail={detail}
          project={project}
          plots={plots}
          customers={customers}
          agents={agents}
          leads={leads}
          siteVisits={siteVisits}
          reservations={projectReservations}
          bookings={projectBookings}
          access={access}
          canEdit={canEdit}
          actorId={actorId}
          piiCtx={piiCtx}
          sessionRole={session?.role}
          cancelRequests={cancelRequests}
          nextId={nextId}
          allAgents={agents}
          onClose={() => setDetail(null)}
          onSaveLead={(l) => { saveLead(l); showFlash(`Lead ${l.leadId} saved`); }}
          onSaveCustomer={(c) => { saveCustomer(c); showFlash(`Customer ${c.id} saved`); }}
          onSaveAgent={(a) => { saveAgent(a); showFlash(`Agent ${a.name} updated`); }}
          onSaveVisit={(v) => {
            saveVisit(v);
            if (v.leadId && toCanonicalSiteVisitStatus(v.status) === "COMPLETED") {
              const lead = byId(leads, v.leadId);
              if (lead) saveLead(transitionLeadStage(lead, "SITE_VISIT_COMPLETED", actorId, `Visit ${v.id} completed`));
            }
            showFlash(`Visit ${v.id} saved`);
          }}
          onConvertLead={(lead) => {
            const cid = nextId("Br", customers);
            const { lead: nextLead, customer } = convertLeadToCustomer(lead, cid, actorId);
            saveCustomer(customer); saveLead(nextLead);
            showFlash(`Lead converted → customer ${customer.id}`);
            setDetail({ kind: "customer", id: customer.id }); setSection("customers");
          }}
          onExtendReservation={(r, hours) => { saveReservation(extendReservation(r, hours, actorId, `+${hours}h`)); showFlash(`Reservation ${r.id} extended ${hours}h`); }}
          onReleaseReservation={(r) => {
            const plot = byId(plots, r.plotId);
            if (!plot) return;
            const res = releaseReservationToAvailable(r, plot, actorId);
            if ("error" in res) { showFlash(res.error); return; }
            saveReservation(res.reservation); savePlot(res.plot); showFlash(`Reservation ${r.id} released → AVAILABLE`);
          }}
          onConvertReservation={(r) => {
            const plot = byId(plots, r.plotId);
            if (!plot) return;
            const id = nextId("BKG-", bookings);
            const price = plot.areaSqYd * plot.pricePerSqYd;
            const result = createBookingAtomic({
              id, customerId: r.customerId, projectId: project.id, plotId: r.plotId, agentId: r.agentId,
              bookingDate: new Date().toISOString().slice(0, 10), bookingAmount: r.amount, totalPlotPrice: price,
              discount: 0, finalAgreedAmount: price, actorId, reservationId: r.id,
            }, { plot, reservations: projectReservations });
            if (!result.ok) { showFlash(result.error); return; }
            saveBooking(result.booking); savePlot(result.plot);
            if (result.reservation) saveReservation(result.reservation);
            showFlash(`Reservation ${r.id} → booking ${result.booking.id}`);
            setDetail({ kind: "booking", id: result.booking.id }); setSection("bookings");
          }}
          onRequestCancel={(entityType, entityId, reason) => {
            if (!canRequestCancellation(session?.role)) return;
            const id = nextId("CXL-", cancelRequests);
            saveCancelRequest(newCancelRequest({ id, entityType, entityId, reason, requestedBy: actorId }));
            if (entityType === "reservation") {
              const r = byId(reservations, entityId);
              if (r) saveReservation({ ...r, cancelRequestStatus: "PENDING", cancelReason: reason, state: "CancelRequested" });
            } else {
              const b = byId(bookings, entityId);
              if (b) saveBooking({ ...b, cancelRequestStatus: "PENDING", cancelReason: reason });
            }
            showFlash(`Cancel request ${id} submitted for review`);
          }}
          onAssignAgent={(agentId, assign) => {
            const agent = byId(agents, agentId);
            if (!agent || !canMutateSalesMaster(session?.role)) return;
            const projects = new Set(agent.projects);
            if (assign) projects.add(project.id); else projects.delete(project.id);
            const hist = [...(agent.assignmentHistory ?? []), { at: new Date().toISOString(), actorId, action: (assign ? "assign" : "remove") as "assign" | "remove", projectId: project.id }];
            saveAgent({ ...agent, projects: [...projects], assignmentHistory: hist });
            showFlash(assign ? `Assigned ${agent.name}` : `Removed ${agent.name}`);
          }}
        />
      )}
    </div>
  );
}

function EntityTable<T>({ rows, columns, empty, onRowClick }: {
  rows: T[]; columns: { h: string; cell: (row: T) => ReactNode }[]; empty: string; onRowClick?: (row: T) => void;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="max-h-[min(560px,55vh)] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-outline-variant/20 bg-surface-low/95 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase backdrop-blur-sm">
            <tr>{columns.map((c) => <th key={c.h || "action"} className="px-3 py-3">{c.h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">{empty}</td></tr>
            ) : rows.map((row, i) => (
              <tr key={(row as { id?: string; raw?: { id?: string } }).id ?? (row as { raw?: { id?: string } }).raw?.id ?? i} className={`border-b border-outline-variant/10 hover:bg-surface-low/40 ${onRowClick ? "cursor-pointer" : ""}`} onClick={() => onRowClick?.(row)}>
                {columns.map((c) => <td key={c.h || "action"} className="px-3 py-2.5">{c.cell(row)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-outline-variant/10 px-3 py-2 text-xs text-muted-foreground numeric">{rows.length} row{rows.length === 1 ? "" : "s"}</p>
    </Panel>
  );
}

function SalesCreateSheet(props: {
  section: SectionKey;
  project: Project;
  plots: Plot[];
  customers: Customer[];
  agents: Agent[];
  leads: Lead[];
  reservations: Reservation[];
  bookings: Booking[];
  nextId: (prefix: string, list: { id: string }[]) => string;
  actorId: string;
  onClose: () => void;
  onCreateLead: (l: Lead) => void;
  onCreateCustomer: (c: Customer) => void;
  onCreateVisit: (v: SiteVisit) => void;
  onCreateReservation: (r: Reservation, plot: Plot) => void;
  onCreateBooking: (
    input: {
      id: string; customerId: string; projectId: string; plotId: string; agentId: string;
      bookingDate: string; bookingAmount: number; totalPlotPrice: number; discount: number;
      finalAgreedAmount: number; notes?: string; paymentMode?: Booking["paymentMode"];
    },
    plot: Plot,
    reservationId?: string,
  ) => void;
}) {
  const { section, project, plots, customers, agents, leads, reservations, bookings, nextId, actorId, onClose } = props;
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("Walk-in");
  const [agentId, setAgentId] = useState(agents[0]?.id ?? "");
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [leadId, setLeadId] = useState(leads[0]?.id ?? "");
  const [visitWho, setVisitWho] = useState<"lead" | "customer">("lead");
  const [plotId, setPlotId] = useState(plots.find((p) => toCanonicalPlotStatus(p.canonicalStatus ?? p.status) === "AVAILABLE")?.id ?? plots[0]?.id ?? "");
  const [amount, setAmount] = useState(50000);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("11:00");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reservationId, setReservationId] = useState("");

  const title = section === "leads" ? "New lead" : section === "customers" ? "Onboard customer" : section === "visits" ? "Schedule site visit" : section === "reservations" ? "New reservation" : section === "bookings" ? "New booking" : "New record";

  const save = () => {
    setError(null);
    if (section === "agents" || section === "dashboard") { setError("Use Agents detail to assign."); return; }
    if (section === "leads") {
      if (!name.trim() || !phone.trim()) { setError("Name and mobile are required."); return; }
      props.onCreateLead(createLeadDraft({
        id: nextId("LEAD-", leads), name, mobile: phone, source,
        assignedAgentId: agentId || agents[0]?.id || "brag0001",
        interestedProjectIds: [project.id], createdBy: actorId, email, notes,
      }));
      return;
    }
    if (section === "customers") {
      if (!name.trim() || !phone.trim()) { setError("Name and phone are required."); return; }
      const id = nextId("Br", customers);
      const c: Customer = {
        id, name: name.trim(), phone: phone.trim(),
        email: email.trim() || `${id.toLowerCase()}@example.com`,
        city: project.city, source, stage: "Lead",
        agentId: agentId || agents[0]?.id || "brag0001",
        plots: [], totalValue: 0, paid: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        interestedProjectIds: [project.id],
      };
      if (notes.trim()) c.notes = notes.trim();
      props.onCreateCustomer(c);
      return;
    }
    if (section === "visits") {
      const v: SiteVisit = {
        id: nextId("SV-", [...leads, ...customers] as { id: string }[]),
        customerId: visitWho === "customer" ? customerId : (leads.find((l) => l.id === leadId)?.convertedCustomerId || customerId || "Br000001"),
        projectId: project.id, agentId: agentId || agents[0]?.id || "brag0001",
        date, time, status: "Scheduled" satisfies SiteVisitStatus, visitAt: `${date}T${time}:00`,
      };
      if (visitWho === "lead" && leadId) v.leadId = leadId;
      if (notes.trim()) v.notes = notes.trim();
      props.onCreateVisit(v);
      return;
    }
    if (section === "reservations") {
      const plot = byId(plots, plotId);
      if (!plot || !customerId) { setError("Plot and customer required."); return; }
      const gate = canReservePlot(plot, reservations);
      if (!gate.ok) { setError(gate.error); return; }
      const reservedAt = new Date().toISOString();
      const hours = project.settings?.reservationDays ? project.settings.reservationDays * 24 : DEFAULT_RESERVATION_HOURS;
      const r: Reservation = {
        id: nextId("RSV-", reservations), plotId: plot.id, customerId,
        agentId: agentId || agents[0]?.id || "brag0001", amount,
        createdAt: reservedAt.slice(0, 10), reservedAt, expiresAt: addHoursIso(reservedAt, hours), state: "Active",
      };
      if (notes.trim()) r.notes = notes.trim();
      props.onCreateReservation(r, plot);
      return;
    }
    if (section === "bookings") {
      const plot = byId(plots, plotId);
      if (!plot || !customerId) { setError("Plot and customer required."); return; }
      const price = plot.areaSqYd * plot.pricePerSqYd;
      const bookingInput: {
        id: string; customerId: string; projectId: string; plotId: string; agentId: string;
        bookingDate: string; bookingAmount: number; totalPlotPrice: number; discount: number;
        finalAgreedAmount: number; notes?: string;
      } = {
        id: nextId("BKG-", bookings), customerId, projectId: project.id, plotId: plot.id,
        agentId: agentId || agents[0]?.id || "brag0001", bookingDate: date, bookingAmount: amount,
        totalPlotPrice: price, discount: 0, finalAgreedAmount: price,
      };
      if (notes.trim()) bookingInput.notes = notes.trim();
      props.onCreateBooking(bookingInput, plot, reservationId || undefined);
    }
  };

  return (
    <EditSheet open onClose={onClose} title={title} description={project.name} onSave={save}>
      <div className="space-y-3" data-testid="sales-create-sheet">
        {(section === "leads" || section === "customers") && (
          <>
            <Field label="Name"><TextInput value={name} onChange={setName} /></Field>
            <Field label={section === "leads" ? "Mobile" : "Phone"}><TextInput value={phone} onChange={setPhone} /></Field>
            <Field label="Email"><TextInput value={email} onChange={setEmail} /></Field>
            <Field label="Source"><TextInput value={source} onChange={setSource} /></Field>
            <Field label="Agent"><SelectInput value={agentId} onChange={setAgentId} options={agents.map((a) => ({ value: a.id, label: a.name }))} /></Field>
          </>
        )}
        {section === "visits" && (
          <>
            <Field label="Link to">
              <SelectInput value={visitWho} onChange={(v) => setVisitWho(v as "lead" | "customer")} options={[{ value: "lead", label: "Lead" }, { value: "customer", label: "Customer" }]} />
            </Field>
            {visitWho === "lead" ? (
              <Field label="Lead"><SelectInput value={leadId} onChange={setLeadId} options={leads.map((l) => ({ value: l.id, label: l.name }))} /></Field>
            ) : (
              <Field label="Customer"><SelectInput value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} /></Field>
            )}
            <Field label="Agent"><SelectInput value={agentId} onChange={setAgentId} options={agents.map((a) => ({ value: a.id, label: a.name }))} /></Field>
            <Field label="Date"><TextInput value={date} onChange={setDate} /></Field>
            <Field label="Time"><TextInput value={time} onChange={setTime} /></Field>
          </>
        )}
        {(section === "reservations" || section === "bookings") && (
          <>
            <Field label="Customer"><SelectInput value={customerId} onChange={setCustomerId} options={customers.map((c) => ({ value: c.id, label: c.name }))} /></Field>
            <Field label="Agent"><SelectInput value={agentId} onChange={setAgentId} options={agents.map((a) => ({ value: a.id, label: a.name }))} /></Field>
            <Field label="Plot"><SelectInput value={plotId} onChange={setPlotId} options={plots.map((p) => ({ value: p.id, label: `${p.number} · ${PLOT_STATUS_LABEL[toCanonicalPlotStatus(p.canonicalStatus ?? p.status)]}` }))} /></Field>
            <Field label="Amount (₹)"><NumberInput value={amount} onChange={setAmount} /></Field>
            <Field label="Date"><TextInput value={date} onChange={setDate} /></Field>
          </>
        )}
        {section === "bookings" && (
          <Field label="From reservation (optional)">
            <SelectInput value={reservationId || "__none"} onChange={(v) => setReservationId(v === "__none" ? "" : v)} options={[
              { value: "__none", label: "— none —" },
              ...reservations.filter((r) => {
                const s = evaluateReservationState(r);
                return r.plotId === plotId && (s === "Active" || s === "Expiring today");
              }).map((r) => ({ value: r.id, label: r.id })),
            ]} />
          </Field>
        )}
        {section !== "agents" && section !== "dashboard" && (
          <Field label="Notes"><TextareaInput value={notes} onChange={setNotes} /></Field>
        )}
        {error && <p className="text-sm text-destructive" data-testid="sales-create-error">{error}</p>}
      </div>
    </EditSheet>
  );
}

function SalesDetailSheet(props: {
  detail: NonNullable<DetailTarget>;
  project: Project;
  plots: Plot[];
  customers: Customer[];
  agents: Agent[];
  leads: Lead[];
  siteVisits: SiteVisit[];
  reservations: Reservation[];
  bookings: Booking[];
  access: SalesAccess;
  canEdit: boolean;
  actorId: string;
  piiCtx: { role: unknown; agentId?: string | null; allAgentsAccess?: boolean };
  sessionRole: unknown;
  cancelRequests: CancelRequest[];
  nextId: (prefix: string, list: { id: string }[]) => string;
  allAgents: Agent[];
  onClose: () => void;
  onSaveLead: (l: Lead) => void;
  onSaveCustomer: (c: Customer) => void;
  onSaveAgent: (a: Agent) => void;
  onSaveVisit: (v: SiteVisit) => void;
  onConvertLead: (l: Lead) => void;
  onExtendReservation: (r: Reservation, hours: number) => void;
  onReleaseReservation: (r: Reservation) => void;
  onConvertReservation: (r: Reservation) => void;
  onRequestCancel: (entityType: "reservation" | "booking", entityId: string, reason: string) => void;
  onAssignAgent: (agentId: string, assign: boolean) => void;
}) {
  const {
    detail, project, plots, customers, agents, leads, siteVisits, reservations, bookings,
    access, canEdit, actorId, piiCtx, sessionRole, onClose, nextId, allAgents,
  } = props;
  const lead = detail.kind === "lead" ? byId(leads, detail.id) : undefined;
  const customer = detail.kind === "customer" ? byId(customers, detail.id) : undefined;
  const agent = detail.kind === "agent" ? byId(agents, detail.id) : undefined;
  const visit = detail.kind === "visit" ? byId(siteVisits, detail.id) : undefined;
  const reservation = detail.kind === "reservation" ? byId(reservations, detail.id) : undefined;
  const booking = detail.kind === "booking" ? byId(bookings, detail.id) : undefined;

  const [draftLead, setDraftLead] = useState(lead);
  const [draftCustomer, setDraftCustomer] = useState(customer);
  const [draftVisit, setDraftVisit] = useState(visit);
  const [cancelReason, setCancelReason] = useState("");
  const [stage, setStage] = useState<LeadStage>(lead?.stage ?? "NEW");
  const [assignPick, setAssignPick] = useState(allAgents[0]?.id ?? "");

  const title =
    detail.kind === "lead" ? `Lead ${lead?.leadId ?? ""}` :
    detail.kind === "customer" ? `Customer ${customer?.id ?? ""}` :
    detail.kind === "agent" ? `Agent ${agent?.name ?? ""}` :
    detail.kind === "visit" ? `Visit ${visit?.id ?? ""}` :
    detail.kind === "reservation" ? `Reservation ${reservation?.id ?? ""}` :
    `Booking ${booking?.id ?? ""}`;

  const saveable = detail.kind === "lead" || detail.kind === "customer" || detail.kind === "visit";
  const save = () => {
    if (detail.kind === "lead" && draftLead && canEdit) {
      let next = { ...draftLead, updatedAt: new Date().toISOString() };
      if (stage !== (lead?.stage ?? stage)) next = transitionLeadStage(draftLead, stage, actorId);
      else next = { ...next, stage };
      props.onSaveLead(next);
      onClose();
    }
    if (detail.kind === "customer" && draftCustomer && (canEdit || access === "limited")) {
      props.onSaveCustomer(draftCustomer);
      onClose();
    }
    if (detail.kind === "visit" && draftVisit && canEdit) {
      props.onSaveVisit(draftVisit);
      onClose();
    }
  };

  return (
    <EditSheet open onClose={onClose} title={title} description={project.name} onSave={saveable ? save : () => onClose()}>
      <div className="space-y-3" data-testid="sales-detail-sheet">
        {detail.kind === "lead" && draftLead && (
          projectLeadForSalesRole(draftLead, piiCtx).redacted ? (
            <p className="text-sm text-muted-foreground">PII redacted — not your assigned lead.</p>
          ) : (
            <>
              <Field label="Name"><TextInput value={draftLead.name} onChange={(v) => setDraftLead({ ...draftLead, name: v })} /></Field>
              <Field label="Mobile"><TextInput value={draftLead.mobile} onChange={(v) => setDraftLead({ ...draftLead, mobile: v })} /></Field>
              <Field label="Email"><TextInput value={draftLead.email ?? ""} onChange={(v) => setDraftLead({ ...draftLead, email: v })} /></Field>
              <Field label="Stage"><SelectInput value={stage} onChange={(v) => setStage(v as LeadStage)} options={LEAD_STAGES.map((s) => ({ value: s, label: LEAD_STAGE_LABEL[s] }))} /></Field>
              <Field label="Assigned agent"><SelectInput value={draftLead.assignedAgentId} onChange={(v) => setDraftLead({ ...draftLead, assignedAgentId: v })} options={agents.map((a) => ({ value: a.id, label: a.name }))} /></Field>
              <Field label="Notes"><TextareaInput value={draftLead.notes ?? ""} onChange={(v) => setDraftLead({ ...draftLead, notes: v })} /></Field>
              <Field label="Next follow-up"><TextInput value={draftLead.nextFollowUp ?? ""} onChange={(v) => setDraftLead({ ...draftLead, nextFollowUp: v })} /></Field>
              <div className="rounded-lg bg-surface-low p-2 text-xs text-muted-foreground">
                Stage history: {draftLead.stageHistory.length} entries
                {draftLead.convertedCustomerId ? ` · converted → ${draftLead.convertedCustomerId}` : ""}
              </div>
              {canEdit && !draftLead.convertedCustomerId && (
                <Btn variant="primary" onClick={() => props.onConvertLead(draftLead)} data-testid="convert-lead-btn">Convert to Customer</Btn>
              )}
            </>
          )
        )}

        {detail.kind === "customer" && draftCustomer && (
          projectCustomerForSalesRole(draftCustomer, piiCtx).redacted && access === "limited" ? (
            <p className="text-sm text-muted-foreground">PII redacted — unrelated customer.</p>
          ) : (
            <>
              <Field label="Name"><TextInput value={draftCustomer.name} onChange={(v) => setDraftCustomer({ ...draftCustomer, name: v })} /></Field>
              <Field label="Phone"><TextInput value={draftCustomer.phone} onChange={(v) => setDraftCustomer({ ...draftCustomer, phone: v })} /></Field>
              <Field label="Email"><TextInput value={draftCustomer.email} onChange={(v) => setDraftCustomer({ ...draftCustomer, email: v })} /></Field>
              <Field label="Notes"><TextareaInput value={draftCustomer.notes ?? ""} onChange={(v) => setDraftCustomer({ ...draftCustomer, notes: v })} /></Field>
              <Field label="Agent"><SelectInput value={draftCustomer.agentId} onChange={(v) => setDraftCustomer({ ...draftCustomer, agentId: v })} options={agents.map((a) => ({ value: a.id, label: a.name }))} /></Field>
              {(canEdit || access === "limited") && (
                <div className="flex flex-wrap gap-2">
                  <Btn onClick={() => props.onSaveCustomer({ ...draftCustomer, reviewFlag: "duplicate", reviewNote: "Marked duplicate", reviewRequestedBy: actorId, reviewRequestedAt: new Date().toISOString() })}>Mark duplicate</Btn>
                  <Btn onClick={() => props.onSaveCustomer({ ...draftCustomer, reviewFlag: "correction", reviewNote: "Correction requested", reviewRequestedBy: actorId, reviewRequestedAt: new Date().toISOString() })}>Request correction</Btn>
                  <Btn onClick={() => {
                    const docs = [...(draftCustomer.documents ?? []), { id: nextId("DOC-", draftCustomer.documents ?? []), name: "KYC-upload.pdf", kind: "KYC", uploadedAt: new Date().toISOString() }];
                    props.onSaveCustomer({ ...draftCustomer, documents: docs });
                  }}>Upload mock KYC</Btn>
                </div>
              )}
              {(draftCustomer.documents?.length ?? 0) > 0 && <p className="text-xs text-muted-foreground">{draftCustomer.documents!.length} document(s) on file</p>}
            </>
          )
        )}

        {detail.kind === "agent" && agent && (
          <>
            <p className="text-sm">{agent.name} · {agent.code} · {agent.region}</p>
            <p className="text-sm text-muted-foreground">Projects: {agent.projects.join(", ") || "—"}</p>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!agent.allAgentsAccess} disabled={!canEdit} onChange={(e) => props.onSaveAgent({ ...agent, allAgentsAccess: e.target.checked })} />
              All-agents access
            </label>
            {canEdit && (
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Assign agent to this project">
                  <SelectInput value={assignPick} onChange={setAssignPick} options={allAgents.map((a) => ({ value: a.id, label: a.name }))} />
                </Field>
                <Btn variant="primary" onClick={() => props.onAssignAgent(assignPick, true)}>Assign</Btn>
                {agent.projects.includes(project.id) && <Btn onClick={() => props.onAssignAgent(agent.id, false)}>Remove from project</Btn>}
              </div>
            )}
            {(agent.assignmentHistory?.length ?? 0) > 0 && (
              <div className="text-xs text-muted-foreground">Assignment history: {agent.assignmentHistory!.length} entries</div>
            )}
          </>
        )}

        {detail.kind === "visit" && draftVisit && (
          <>
            <Field label="Status">
              <SelectInput value={draftVisit.status} onChange={(v) => setDraftVisit({ ...draftVisit, status: v as SiteVisitStatus })} options={[
                { value: "Scheduled", label: "SCHEDULED" }, { value: "Completed", label: "COMPLETED" },
                { value: "Cancelled", label: "CANCELLED" }, { value: "No-show", label: "NO_SHOW" },
              ]} />
            </Field>
            <Field label="Outcome"><TextInput value={draftVisit.outcome ?? ""} onChange={(v) => setDraftVisit({ ...draftVisit, outcome: v })} /></Field>
            <Field label="Next action"><TextInput value={draftVisit.nextAction ?? ""} onChange={(v) => setDraftVisit({ ...draftVisit, nextAction: v })} /></Field>
            <Field label="Follow-up date"><TextInput value={draftVisit.followUpDate ?? ""} onChange={(v) => setDraftVisit({ ...draftVisit, followUpDate: v })} /></Field>
            <Field label="Notes"><TextareaInput value={draftVisit.notes ?? ""} onChange={(v) => setDraftVisit({ ...draftVisit, notes: v })} /></Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!draftVisit.attended} onChange={(e) => setDraftVisit({ ...draftVisit, attended: e.target.checked })} />
              Attended
            </label>
          </>
        )}

        {detail.kind === "reservation" && reservation && (
          <>
            <p className="text-sm">Plot {byId(plots, reservation.plotId)?.number} · state <Chip>{evaluateReservationState(reservation)}</Chip></p>
            <p className="text-xs text-muted-foreground numeric">Reserved {reservation.reservedAt ?? reservation.createdAt} · expires {reservation.expiresAt}</p>
            {(reservation.extensionHistory?.length ?? 0) > 0 && <p className="text-xs text-muted-foreground">{reservation.extensionHistory!.length} extension(s)</p>}
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => props.onExtendReservation(reservation, 24)}>+24h</Btn>
                <Btn onClick={() => props.onExtendReservation(reservation, 48)}>+48h</Btn>
                <Btn onClick={() => props.onReleaseReservation(reservation)}>Release → Available</Btn>
                <Btn variant="primary" onClick={() => props.onConvertReservation(reservation)} data-testid="convert-reservation-btn">Convert to Booking</Btn>
              </div>
            )}
            {canRequestCancellation(sessionRole) && reservation.state !== "Converted" && (
              <div className="space-y-2 border-t border-outline-variant/20 pt-3">
                <Field label="Cancel reason"><TextInput value={cancelReason} onChange={setCancelReason} /></Field>
                <Btn onClick={() => { if (!cancelReason.trim()) return; props.onRequestCancel("reservation", reservation.id, cancelReason.trim()); onClose(); }}>Request cancellation</Btn>
              </div>
            )}
          </>
        )}

        {detail.kind === "booking" && booking && (
          <>
            <p className="text-sm">{booking.bookingNumber ?? booking.id} · {booking.bookingStatus ?? booking.stage}</p>
            <p className="text-sm numeric">{formatINR(booking.finalAgreedAmount ?? booking.amount)}</p>
            <p className="text-xs text-muted-foreground">Docs: {booking.documentationStatus ?? "—"} · Registration: {booking.registrationStatus ?? "—"}</p>
            {canRequestCancellation(sessionRole) && booking.stage !== "Cancelled" && (
              <div className="space-y-2 border-t border-outline-variant/20 pt-3">
                <Field label="Cancel reason"><TextInput value={cancelReason} onChange={setCancelReason} /></Field>
                <Btn onClick={() => { if (!cancelReason.trim()) return; props.onRequestCancel("booking", booking.id, cancelReason.trim()); onClose(); }}>Request cancellation</Btn>
              </div>
            )}
          </>
        )}
      </div>
    </EditSheet>
  );
}
