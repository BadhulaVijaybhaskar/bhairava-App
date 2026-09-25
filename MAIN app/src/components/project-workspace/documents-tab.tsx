import { useEffect, useMemo, useState } from "react";
import { FileText, Landmark, RefreshCw, Shield } from "lucide-react";
import { Btn, Chip, Panel, SectionTitle } from "@/components/kit";
import { EditSheet, Field, SelectInput, TextInput, TextareaInput } from "@/components/form-kit";
import type { Project } from "@/lib/mock-data";
import { byId, documents as seedDocuments, registrations as seedRegistrations } from "@/lib/mock-data";
import { useData } from "@/lib/store";
import { getSession } from "@/lib/auth";
import {
  DOCUMENT_VISIBILITY_LABEL,
  REGISTRATION_STAGE_LABEL,
  RESALE_STAGE_LABEL,
  canMutateOperations,
  canViewOperations,
  filterDocumentsForRole,
  filterRegistrationsForRole,
  filterResalesForRole,
  legacyDocumentToProject,
  legacyRegistrationToCase,
  normalizeRegistrationCase,
  resaleCasesFromPlots,
  deriveOpsDashboard,
  replaceDocumentVersion,
  archiveDocument,
  setDocumentVerification,
  applyScheduleRegistration,
  applyCompleteRegistration,
  createResaleListing,
  registrationDocsBlocker,
  missingRequiredDocs,
  type DocumentVisibility,
  type ProjectDocument,
  type RegistrationCase,
  type RegistrationStage,
  type ResaleCase,
} from "@/lib/domain/operations";
import { buildOperationsDemoSeed } from "@/lib/domain/operations-seed";

type OpsSection = "documents" | "registration" | "resale";

function visTone(v: DocumentVisibility): "neutral" | "info" | "warning" | "positive" {
  if (v === "INTERNAL") return "warning";
  if (v === "AGENT_VISIBLE") return "info";
  return "positive";
}

export function ProjectDocumentsTab({ project }: { project: Project }) {
  const session = getSession();
  const role = session?.role;
  const canView = canViewOperations(role);
  const canMutate = canMutateOperations(role);

  const store = useData() as ReturnType<typeof useData> & {
    opsDocuments?: ProjectDocument[];
    opsRegistrations?: RegistrationCase[];
    opsResales?: ResaleCase[];
    savePlot: (p: (typeof plots extends Array<infer P> ? P : never) | any) => void;
    saveOpsDocument?: (d: ProjectDocument) => void;
    saveOpsRegistration?: (r: RegistrationCase) => void;
    saveOpsResale?: (r: ResaleCase) => void;
    ensureOpsSeed?: (projectId: string) => void;
  };
  const { customers, plots, bookings, agents, savePlot } = store;
  const docsSource = seedDocuments;
  const regsSource = seedRegistrations;

  const sessionAgentId = useMemo(() => {
    const email = (session?.email ?? "").toLowerCase();
    return agents.find((a) => (a.email ?? "").toLowerCase() === email)?.id ?? null;
  }, [agents, session?.email]);

  const agentAssignedCustomerIds = useMemo(() => {
    if (!sessionAgentId) return [] as string[];
    return bookings
      .filter((b) => b.projectId === project.id && b.agentId === sessionAgentId)
      .map((b) => b.customerId);
  }, [bookings, project.id, sessionAgentId]);

  const [section, setSection] = useState<OpsSection>("documents");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [selectedResaleId, setSelectedResaleId] = useState<string | null>(null);
  const [visFilter, setVisFilter] = useState<DocumentVisibility | "ALL">("ALL");
  const [sheet, setSheet] = useState<"doc" | "reg" | "resale" | null>(null);
  const [docForm, setDocForm] = useState({
    name: "",
    docType: "Other" as ProjectDocument["docType"],
    visibility: "INTERNAL" as DocumentVisibility,
    notes: "",
  });
  const [regForm, setRegForm] = useState({
    bookingId: "",
    stage: "DOCUMENTS_PENDING" as RegistrationStage,
    slot: "",
    subRegistrar: "Shamshabad",
    notes: "",
  });
  const [localDocs, setLocalDocs] = useState<ProjectDocument[]>([]);
  const [localRegs, setLocalRegs] = useState<RegistrationCase[]>([]);
  const [localResales, setLocalResales] = useState<ResaleCase[]>([]);
  const [seeded, setSeeded] = useState(false);

  // Migrate-on-load: lift legacy mock docs/regs + demo extras once (no wipe of local edits).
  useEffect(() => {
    if (seeded) return;
    const seed = buildOperationsDemoSeed({
      projectId: project.id,
      bookings: bookings.filter((b) => b.projectId === project.id),
      plots: plots.filter((p) => p.projectId === project.id),
      documents: docsSource,
      registrations: regsSource,
    });
    setLocalDocs((prev) => {
      const map = new Map(prev.map((d) => [d.id, d]));
      for (const d of seed.documents) if (!map.has(d.id)) map.set(d.id, d);
      return [...map.values()];
    });
    setLocalRegs((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      for (const r of seed.registrations) if (!map.has(r.id)) map.set(r.id, r);
      return [...map.values()];
    });
    setLocalResales((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      for (const r of seed.resales) if (!map.has(r.id)) map.set(r.id, r);
      return [...map.values()];
    });
    setSeeded(true);
    store.ensureOpsSeed?.(project.id);
  }, [seeded, project.id, bookings, plots, docsSource, regsSource]);

  const baseDocs = useMemo(() => {
    const lifted = docsSource
      .filter((d) => d.projectId === project.id)
      .map((d) => legacyDocumentToProject(d));
    const map = new Map<string, ProjectDocument>();
    for (const d of lifted) map.set(d.id, d);
    for (const d of localDocs) map.set(d.id, d);
    return [...map.values()].sort((a, b) => b.modified.localeCompare(a.modified));
  }, [docsSource, localDocs, project.id]);

  const baseRegs = useMemo(() => {
    const bookingIds = new Set(bookings.filter((b) => b.projectId === project.id).map((b) => b.id));
    const lifted = regsSource
      .filter((r) => bookingIds.has(r.bookingId))
      .map((r) => legacyRegistrationToCase(r, project.id));
    const map = new Map<string, RegistrationCase>();
    for (const r of lifted) map.set(r.id, r);
    for (const r of localRegs) map.set(r.id, r);
    return [...map.values()];
  }, [regsSource, localRegs, bookings, project.id]);

  const baseResales = useMemo(() => {
    const fromPlots = resaleCasesFromPlots(
      plots.filter((p) => p.projectId === project.id),
      project.id,
    );
    const map = new Map<string, ResaleCase>();
    for (const r of fromPlots) map.set(r.id, r);
    for (const r of localResales) map.set(r.id, r);
    return [...map.values()];
  }, [plots, localResales, project.id]);

  const visibleDocs = useMemo(() => {
    let list = filterDocumentsForRole(baseDocs, {
      projectId: project.id,
      role,
      agentAssignedCustomerIds,
    });
    if (visFilter !== "ALL") list = list.filter((d) => d.visibility === visFilter);
    return list;
  }, [baseDocs, role, project.id, agentAssignedCustomerIds, visFilter]);

  const visibleRegs = useMemo(
    () =>
      filterRegistrationsForRole(baseRegs, bookings, {
        projectId: project.id,
        role,
        agentId: sessionAgentId,
      }),
    [baseRegs, bookings, project.id, role, sessionAgentId],
  );

  const visibleResales = useMemo(
    () => filterResalesForRole(baseResales, { projectId: project.id, role }),
    [baseResales, project.id, role],
  );

  const detailDoc = selectedDocId ? visibleDocs.find((d) => d.id === selectedDocId) : undefined;
  const detailReg = selectedRegId ? visibleRegs.find((r) => r.id === selectedRegId) : undefined;
  const detailResale = selectedResaleId
    ? visibleResales.find((r) => r.id === selectedResaleId)
    : undefined;

  const opsDashboard = useMemo(
    () =>
      deriveOpsDashboard({
        documents: baseDocs,
        registrations: baseRegs,
        resales: baseResales,
        projectId: project.id,
        role,
        agentAssignedCustomerIds,
        bookings,
        agentId: sessionAgentId,
      }),
    [baseDocs, baseRegs, baseResales, project.id, role, agentAssignedCustomerIds, bookings, sessionAgentId],
  );

  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [resaleForm, setResaleForm] = useState({ plotId: "", askingPrice: "", notes: "" });

  function reloadDemoSeed() {
    const seed = buildOperationsDemoSeed({
      projectId: project.id,
      bookings: bookings.filter((b) => b.projectId === project.id),
      plots: plots.filter((p) => p.projectId === project.id),
      documents: docsSource,
      registrations: regsSource,
    });
    setLocalDocs(seed.documents);
    setLocalRegs(seed.registrations);
    setLocalResales(seed.resales);
    setSeeded(true);
  }

  function saveDoc() {
    if (!canMutate || !docForm.name.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const row: ProjectDocument = {
      id: `DOC-OPS-${Date.now()}`,
      projectId: project.id,
      name: docForm.name.trim(),
      docType: docForm.docType,
      visibility: docForm.visibility,
      verified: "Pending",
      modified: today,
      sizeKb: 120,
      uploadedBy: session?.email ?? "admin@bhairava.com",
      ...(docForm.notes.trim() ? { notes: docForm.notes.trim() } : {}),
    };
    setLocalDocs((prev) => [row, ...prev]);
    setSelectedDocId(row.id);
    setSheet(null);
    setDocForm({ name: "", docType: "Other", visibility: "INTERNAL", notes: "" });
  }

  function saveReg() {
    if (!canMutate || !regForm.bookingId) return;
    const booking = byId(bookings, regForm.bookingId);
    if (!booking) return;
    const row = normalizeRegistrationCase({
      id: `REG-OPS-${Date.now()}`,
      projectId: project.id,
      bookingId: booking.id,
      customerId: booking.customerId,
      plotId: booking.plotId,
      stage: regForm.stage,
      slot: regForm.slot.trim() || `${new Date().toISOString().slice(0, 10)} · 11:00`,
      subRegistrar: regForm.subRegistrar.trim() || "Shamshabad",
      registrarOffice: regForm.subRegistrar.trim() || "Shamshabad",
      responsibleStaff: session?.email ?? "admin@bhairava.com",
      requiredDocTypes: ["KYC", "Agreement", "Sale deed"],
      ...(regForm.notes.trim() ? { notes: regForm.notes.trim() } : {}),
    });
    setLocalRegs((prev) => [row, ...prev]);
    setSelectedRegId(row.id);
    setSheet(null);
  }


  function verifySelectedDoc() {
    if (!canMutate || !detailDoc) return;
    const next = setDocumentVerification(detailDoc, "Verified");
    setLocalDocs((prev) => {
      const map = new Map(prev.map((d) => [d.id, d]));
      map.set(next.id, next);
      return [...map.values()];
    });
    setActionMsg(`Verified ${next.name}`);
  }

  function replaceSelectedDoc() {
    if (!canMutate || !detailDoc) return;
    const next = replaceDocumentVersion(detailDoc, {
      name: detailDoc.name.replace(/(\.\w+)?$/, (m) => `-v${(detailDoc.currentVersion ?? 1) + 1}${m || ".pdf"}`),
      sizeKb: Math.max(80, detailDoc.sizeKb + 15),
      uploadedBy: session?.email ?? "admin@bhairava.com",
      notes: "Replaced version (no hard-delete)",
    });
    setLocalDocs((prev) => {
      const map = new Map(prev.map((d) => [d.id, d]));
      map.set(next.id, next);
      return [...map.values()];
    });
    setSelectedDocId(next.id);
    setActionMsg(`Replaced → v${next.currentVersion}`);
  }

  function archiveSelectedDoc() {
    if (!canMutate || !detailDoc) return;
    const next = archiveDocument(detailDoc);
    setLocalDocs((prev) => {
      const map = new Map(prev.map((d) => [d.id, d]));
      map.set(next.id, next);
      return [...map.values()];
    });
    setActionMsg(`Archived ${next.name}`);
    setSelectedDocId(null);
  }

  function scheduleSelectedReg() {
    if (!canMutate || !detailReg) return;
    const scheduleOpts: { scheduledAt: string; registrarOffice?: string } = {
      scheduledAt: detailReg.slot || `${new Date().toISOString().slice(0, 10)}T11:00:00`,
    };
    const office = detailReg.registrarOffice || detailReg.subRegistrar;
    if (office) scheduleOpts.registrarOffice = office;
    const result = applyScheduleRegistration(detailReg, baseDocs, scheduleOpts);
    if (!result.ok) {
      setActionMsg(result.error);
      return;
    }
    setLocalRegs((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      map.set(result.registration.id, result.registration);
      return [...map.values()];
    });
    setSelectedRegId(result.registration.id);
    setActionMsg("Registration scheduled");
  }

  function completeSelectedReg() {
    if (!canMutate || !detailReg) return;
    const plot = plots.find((p) => p.id === detailReg.plotId);
    if (!plot) {
      setActionMsg("Plot not found for registration");
      return;
    }
    const result = applyCompleteRegistration(detailReg, baseDocs, plot, {
      actorId: session?.email ?? "admin@bhairava.com",
    });
    if (!result.ok) {
      setActionMsg(result.error);
      return;
    }
    setLocalRegs((prev) => {
      const map = new Map(prev.map((r) => [r.id, r]));
      map.set(result.registration.id, result.registration);
      return [...map.values()];
    });
    savePlot(result.plot);
    setSelectedRegId(result.registration.id);
    setActionMsg(`Registration completed → plot ${result.plot.canonicalStatus ?? result.plot.status}`);
  }

  function createResaleFromForm() {
    if (!canMutate || !resaleForm.plotId) return;
    const plot = plots.find((p) => p.id === resaleForm.plotId);
    if (!plot) {
      setActionMsg("Plot not found");
      return;
    }
    const price = Number(resaleForm.askingPrice);
    const booking = bookings.find((b) => b.plotId === plot.id && b.projectId === project.id);
    const listingOpts: Parameters<typeof createResaleListing>[1] = {
      listingId: `RSL-OPS-${Date.now()}`,
      askingPrice: price,
      actorId: session?.email ?? "admin@bhairava.com",
      approvalStatus: "APPROVED",
    };
    if (booking?.id) listingOpts.originalBookingId = booking.id;
    if (resaleForm.notes.trim()) listingOpts.notes = resaleForm.notes.trim();
    const result = createResaleListing(plot, listingOpts);
    if (!result.ok) {
      setActionMsg(result.error);
      return;
    }
    setLocalResales((prev) => [result.listing, ...prev]);
    savePlot(result.plot);
    setSelectedResaleId(result.listing.listingId ?? result.listing.id);
    setSheet(null);
    setActionMsg(`Resale listed → plot ${result.plot.canonicalStatus ?? result.plot.status}`);
  }

  if (!canView) {
    return (
      <Panel>
        <SectionTitle>Operations</SectionTitle>
        <p className="text-sm text-muted-foreground" data-testid="ops-denied">
          Your role cannot access project operations in MAIN.
        </p>
      </Panel>
    );
  }

  const projectBookings = bookings.filter((b) => b.projectId === project.id);

  return (
    <div className="space-y-4" data-testid="ops-workspace">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-foreground">Operations</h2>
          <p className="text-sm text-muted-foreground">
            Documents · Registration · Resale — project vault (Customer never browses MAIN)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={reloadDemoSeed} data-testid="ops-seed-demo">
            Reload demo ops
          </Btn>
          {canMutate && section === "documents" && (
            <Btn
              variant="primary"
              onClick={() => {
                setDocForm({ name: "", docType: "Other", visibility: "INTERNAL", notes: "" });
                setSheet("doc");
              }}
              data-testid="ops-add-doc"
            >
              Add document
            </Btn>
          )}
          {canMutate && section === "registration" && (
            <Btn
              variant="primary"
              onClick={() => {
                setRegForm({
                  bookingId: projectBookings[0]?.id ?? "",
                  stage: "DOCUMENTS_PENDING",
                  slot: "",
                  subRegistrar: "Shamshabad",
                  notes: "",
                });
                setSheet("reg");
              }}
              data-testid="ops-add-reg"
            >
              Add registration
            </Btn>
          )}
          {canMutate && section === "resale" && (
            <Btn
              variant="primary"
              onClick={() => {
                const eligible = plots.filter((p) => {
                  const st = (p.canonicalStatus ?? p.status ?? "").toString().toUpperCase();
                  return p.projectId === project.id && (st === "SOLD" || st === "REGISTERED" || st === "registered" || st === "sold");
                });
                setResaleForm({
                  plotId: eligible[0]?.id ?? "",
                  askingPrice: eligible[0] ? String(Math.round((eligible[0].areaSqYd || 200) * (eligible[0].pricePerSqYd || 25000))) : "",
                  notes: "",
                });
                setSheet("resale");
              }}
              data-testid="ops-add-resale"
            >
              List for resale
            </Btn>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Operations sections">
        {(
          [
            ["documents", "Documents", FileText],
            ["registration", "Registration", Landmark],
            ["resale", "Resale", RefreshCw],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={section === id}
            data-testid={`ops-section-${id}`}
            onClick={() => setSection(id)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition ${
              section === id
                ? "bg-primary text-primary-foreground"
                : "bg-surface-c text-muted-foreground hover:bg-surface-high"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {actionMsg && (
        <p className="rounded-lg bg-surface-c px-3 py-2 text-sm text-foreground" data-testid="ops-action-msg">
          {actionMsg}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6" data-testid="ops-dashboard">
        {[
          ["Docs pending", opsDashboard.documentsPending],
          ["Docs verified", opsDashboard.documentsVerified],
          ["Regs pending", opsDashboard.registrationsPending],
          ["Regs scheduled", opsDashboard.registrationsScheduled],
          ["Regs completed", opsDashboard.registrationsCompleted],
          ["Resale active", opsDashboard.resaleListingsActive],
        ].map(([label, value]) => (
          <Panel key={String(label)} className="!p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="font-display text-xl text-foreground" data-testid={`ops-metric-${String(label).toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </div>
          </Panel>
        ))}
      </div>

      {section === "documents" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]" data-testid="ops-documents">
          <Panel>
            <SectionTitle
              aside={
                <Field label="Visibility">
                  <SelectInput
                    value={visFilter}
                    onChange={(v) => setVisFilter(v as DocumentVisibility | "ALL")}
                    options={[
                      { value: "ALL", label: "All visible to me" },
                      { value: "INTERNAL", label: "INTERNAL" },
                      { value: "AGENT_VISIBLE", label: "AGENT_VISIBLE" },
                      {
                        value: "CUSTOMER_PROFILE_RELATED",
                        label: "CUSTOMER_PROFILE_RELATED",
                      },
                    ]}
                  />
                </Field>
              }
            >
              Project documents
            </SectionTitle>
            <p className="mb-3 text-xs text-muted-foreground">
              Visibility: INTERNAL · AGENT_VISIBLE · CUSTOMER_PROFILE_RELATED
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Visibility</th>
                    <th className="py-2">Modified</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDocs.map((d) => (
                    <tr
                      key={d.id}
                      data-testid={`ops-doc-row-${d.id}`}
                      className={`cursor-pointer border-t border-border hover:bg-surface-low ${
                        selectedDocId === d.id ? "bg-surface-low" : ""
                      }`}
                      onClick={() => setSelectedDocId(d.id)}
                    >
                      <td className="py-2 pr-3 font-medium text-foreground">{d.name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{d.docType}</td>
                      <td className="py-2 pr-3">
                        <Chip tone={visTone(d.visibility)}>
                          {DOCUMENT_VISIBILITY_LABEL[d.visibility]}
                        </Chip>
                      </td>
                      <td className="py-2 text-muted-foreground">{d.modified.slice(0, 10)}</td>
                    </tr>
                  ))}
                  {visibleDocs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No documents in this visibility scope.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <SectionTitle>Document detail</SectionTitle>
            {!detailDoc ? (
              <p className="text-sm text-muted-foreground">Select a document.</p>
            ) : (
              <div className="space-y-3 text-sm" data-testid="ops-doc-detail">
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-medium text-foreground">{detailDoc.name}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Chip tone={visTone(detailDoc.visibility)}>
                    {DOCUMENT_VISIBILITY_LABEL[detailDoc.visibility]}
                  </Chip>
                  <Chip tone="neutral">{detailDoc.docType}</Chip>
                  <Chip tone={detailDoc.verified === "Verified" ? "positive" : "warning"}>
                    {detailDoc.verified}
                  </Chip>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Project</div>
                  <div>{project.name}</div>
                </div>
                {detailDoc.customerId && (
                  <div>
                    <div className="text-xs text-muted-foreground">Customer link</div>
                    <div>{byId(customers, detailDoc.customerId)?.name ?? detailDoc.customerId}</div>
                  </div>
                )}
                {detailDoc.bookingId && (
                  <div>
                    <div className="text-xs text-muted-foreground">Booking</div>
                    <div className="font-mono text-xs">{detailDoc.bookingId}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted-foreground">Modified</div>
                  <div>
                    {detailDoc.modified.slice(0, 10)}
                    {detailDoc.uploadedBy ? ` · ${detailDoc.uploadedBy}` : ""}
                    {` · ${detailDoc.sizeKb} KB`}
                  </div>
                </div>
                {detailDoc.notes && (
                  <div>
                    <div className="text-xs text-muted-foreground">Notes</div>
                    <div>{detailDoc.notes}</div>
                  </div>
                )}
                {canMutate && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Btn variant="tonal" onClick={verifySelectedDoc} data-testid="ops-verify-doc">
                      Verify
                    </Btn>
                    <Btn variant="tonal" onClick={replaceSelectedDoc} data-testid="ops-replace-doc">
                      Replace / version
                    </Btn>
                    <Btn variant="ghost" onClick={archiveSelectedDoc} data-testid="ops-archive-doc">
                      Archive
                    </Btn>
                  </div>
                )}
                {(detailDoc.versions?.length ?? 0) > 0 && (
                  <div data-testid="ops-doc-versions">
                    <div className="text-xs text-muted-foreground">Version history</div>
                    <ul className="mt-1 space-y-1 text-xs font-mono">
                      {[...(detailDoc.versions ?? [])].slice().reverse().map((v) => (
                        <li key={v.version}>
                          v{v.version} · {v.name} · {String(v.uploadedAt).slice(0, 10)} · {v.uploadedBy}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="flex items-start gap-2 rounded-lg bg-surface-c p-2 text-xs text-muted-foreground">
                  <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Customer never browses this project vault in MAIN. Profile-related docs may surface
                  only on the customer profile when linked.
                </p>
              </div>
            )}
          </Panel>
        </div>
      )}

      {section === "registration" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]" data-testid="ops-registration">
          <Panel>
            <SectionTitle>Registration cases</SectionTitle>
            <p className="mb-3 text-xs text-muted-foreground">
              Project-scoped ops linked to bookings/plots — no fake metrics
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Case</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Plot</th>
                    <th className="py-2">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRegs.map((r) => (
                    <tr
                      key={r.id}
                      data-testid={`ops-reg-row-${r.id}`}
                      className={`cursor-pointer border-t border-border hover:bg-surface-low ${
                        selectedRegId === r.id ? "bg-surface-low" : ""
                      }`}
                      onClick={() => setSelectedRegId(r.id)}
                    >
                      <td className="py-2 pr-3 font-mono text-xs">{r.id}</td>
                      <td className="py-2 pr-3">
                        {byId(customers, r.customerId)?.name ?? r.customerId}
                      </td>
                      <td className="py-2 pr-3">{byId(plots, r.plotId)?.number ?? r.plotId}</td>
                      <td className="py-2">
                        <Chip tone="info">{REGISTRATION_STAGE_LABEL[r.stage]}</Chip>
                      </td>
                    </tr>
                  ))}
                  {visibleRegs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No registration cases yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel>
            <SectionTitle>Registration detail</SectionTitle>
            {!detailReg ? (
              <p className="text-sm text-muted-foreground">Select a case.</p>
            ) : (
              <div className="space-y-2 text-sm" data-testid="ops-reg-detail">
                <div className="font-mono text-xs text-muted-foreground">{detailReg.id}</div>
                <div>
                  <span className="text-muted-foreground">Booking: </span>
                  {detailReg.bookingId}
                </div>
                <div>
                  <span className="text-muted-foreground">Customer: </span>
                  {byId(customers, detailReg.customerId)?.name}
                </div>
                <div>
                  <span className="text-muted-foreground">Plot: </span>
                  {byId(plots, detailReg.plotId)?.number}
                </div>
                <Chip tone="info">{REGISTRATION_STAGE_LABEL[detailReg.stage]}</Chip>
                <div>
                  <span className="text-muted-foreground">Slot: </span>
                  {detailReg.slot}
                </div>
                <div>
                  <span className="text-muted-foreground">Sub-registrar: </span>
                  {detailReg.subRegistrar}
                </div>
                {detailReg.notes && <p>{detailReg.notes}</p>}
                {(() => {
                  const miss = missingRequiredDocs(detailReg, baseDocs);
                  const blocker = registrationDocsBlocker(detailReg, baseDocs);
                  return (
                    <div className="space-y-2" data-testid="ops-reg-docs-gate">
                      <div className="text-xs text-muted-foreground">Required docs</div>
                      <div className="text-xs">
                        Missing: {miss.missingTypes.length ? miss.missingTypes.join(", ") : "—"}
                      </div>
                      <div className="text-xs">
                        Unverified: {miss.unverifiedTypes.length ? miss.unverifiedTypes.join(", ") : "—"}
                      </div>
                      {blocker && (
                        <p className="rounded bg-surface-c p-2 text-xs text-amber-700 dark:text-amber-300" data-testid="ops-reg-blocker">
                          {blocker}
                        </p>
                      )}
                    </div>
                  );
                })()}
                {canMutate && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Btn variant="tonal" onClick={scheduleSelectedReg} data-testid="ops-schedule-reg">Schedule</Btn>
                    <Btn variant="primary" onClick={completeSelectedReg} data-testid="ops-complete-reg">Complete</Btn>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      )}

      {section === "resale" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]" data-testid="ops-resale">
          <Panel>
            <SectionTitle>Resale pipeline</SectionTitle>
            <p className="mb-3 text-xs text-muted-foreground">
              Derived from resale-status plots + ops cases — no invented totals
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Case</th>
                    <th className="py-2 pr-3">Plot</th>
                    <th className="py-2 pr-3">Ask</th>
                    <th className="py-2">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResales.map((r) => {
                    const plot = byId(plots, r.plotId);
                    return (
                      <tr
                        key={r.id}
                        data-testid={`ops-resale-row-${r.id}`}
                        className={`cursor-pointer border-t border-border hover:bg-surface-low ${
                          selectedResaleId === r.id ? "bg-surface-low" : ""
                        }`}
                        onClick={() => setSelectedResaleId(r.id)}
                      >
                        <td className="py-2 pr-3 font-mono text-xs">{r.id}</td>
                        <td className="py-2 pr-3">{plot?.number ?? r.plotId}</td>
                        <td className="py-2 pr-3">₹{r.askPrice.toLocaleString("en-IN")}</td>
                        <td className="py-2">
                          <Chip tone="warning">{RESALE_STAGE_LABEL[r.stage]}</Chip>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleResales.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        No resale cases. Plots marked resale or demo seed will appear here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
          <Panel>
            <SectionTitle>Resale detail</SectionTitle>
            {!detailResale ? (
              <p className="text-sm text-muted-foreground">Select a resale case.</p>
            ) : (
              <div className="space-y-2 text-sm" data-testid="ops-resale-detail">
                <div className="font-mono text-xs text-muted-foreground">{detailResale.id}</div>
                <div>
                  <span className="text-muted-foreground">Plot: </span>
                  {byId(plots, detailResale.plotId)?.number}
                </div>
                <Chip tone="warning">{RESALE_STAGE_LABEL[detailResale.stage]}</Chip>
                <div>Ask ₹{detailResale.askPrice.toLocaleString("en-IN")}</div>
                <div className="text-xs text-muted-foreground">
                  Listed {detailResale.listedAt.slice(0, 10)}
                </div>
                {detailResale.notes && <p>{detailResale.notes}</p>}
              </div>
            )}
          </Panel>
        </div>
      )}

      <EditSheet
        open={sheet === "doc"}
        title="Add project document"
        description="Visibility controls who can see this vault entry in MAIN."
        onClose={() => setSheet(null)}
        onSave={saveDoc}
      >
        <Field label="Name" required>
          <TextInput
            value={docForm.name}
            onChange={(v) => setDocForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. master-layout.pdf"
          />
        </Field>
        <Field label="Type">
          <SelectInput
            value={docForm.docType}
            onChange={(v) =>
              setDocForm((f) => ({ ...f, docType: v as ProjectDocument["docType"] }))
            }
            options={[
              { value: "Agreement", label: "Agreement" },
              { value: "Sale deed", label: "Sale deed" },
              { value: "KYC", label: "KYC" },
              { value: "Receipt", label: "Receipt" },
              { value: "Layout approval", label: "Layout approval" },
              { value: "NOC", label: "NOC" },
              { value: "Master layout", label: "Master layout" },
              { value: "Other", label: "Other" },
            ]}
          />
        </Field>
        <Field label="Visibility">
          <SelectInput
            value={docForm.visibility}
            onChange={(v) => setDocForm((f) => ({ ...f, visibility: v as DocumentVisibility }))}
            options={[
              { value: "INTERNAL", label: "INTERNAL" },
              { value: "AGENT_VISIBLE", label: "AGENT_VISIBLE" },
              { value: "CUSTOMER_PROFILE_RELATED", label: "CUSTOMER_PROFILE_RELATED" },
            ]}
          />
        </Field>
        <Field label="Notes">
          <TextareaInput
            value={docForm.notes}
            onChange={(v) => setDocForm((f) => ({ ...f, notes: v }))}
          />
        </Field>
      </EditSheet>

      <EditSheet
        open={sheet === "reg"}
        title="Add registration case"
        description="Link to an existing booking — no invented progress totals."
        onClose={() => setSheet(null)}
        onSave={saveReg}
      >
        <Field label="Booking" required>
          <SelectInput
            value={regForm.bookingId}
            onChange={(v) => setRegForm((f) => ({ ...f, bookingId: v }))}
            options={[
              { value: "", label: "Select booking" },
              ...projectBookings.map((b) => ({
                value: b.id,
                label: `${b.id} · ${byId(customers, b.customerId)?.name ?? b.customerId}`,
              })),
            ]}
          />
        </Field>
        <Field label="Stage">
          <SelectInput
            value={regForm.stage}
            onChange={(v) => setRegForm((f) => ({ ...f, stage: v as RegistrationStage }))}
            options={(Object.keys(REGISTRATION_STAGE_LABEL) as RegistrationStage[]).map((s) => ({
              value: s,
              label: REGISTRATION_STAGE_LABEL[s],
            }))}
          />
        </Field>
        <Field label="Slot">
          <TextInput
            value={regForm.slot}
            onChange={(v) => setRegForm((f) => ({ ...f, slot: v }))}
            placeholder="2026-09-20 · 11:00"
          />
        </Field>
        <Field label="Sub-registrar">
          <TextInput
            value={regForm.subRegistrar}
            onChange={(v) => setRegForm((f) => ({ ...f, subRegistrar: v }))}
          />
        </Field>
        <Field label="Notes">
          <TextareaInput
            value={regForm.notes}
            onChange={(v) => setRegForm((f) => ({ ...f, notes: v }))}
          />
        </Field>
      </EditSheet>
      <EditSheet
        open={sheet === "resale"}
        title="Create resale listing"
        description="Eligible plots: SOLD or REGISTERED. Ownership trail preserved."
        onClose={() => setSheet(null)}
        onSave={createResaleFromForm}
      >
        <Field label="Plot" required>
          <SelectInput
            value={resaleForm.plotId}
            onChange={(v) => setResaleForm((f) => ({ ...f, plotId: v }))}
            options={[
              { value: "", label: "Select plot" },
              ...plots
                .filter((p) => p.projectId === project.id)
                .map((p) => ({
                  value: p.id,
                  label: `#${p.number} · ${(p.canonicalStatus ?? p.status) as string}`,
                })),
            ]}
          />
        </Field>
        <Field label="Asking price" required>
          <TextInput
            value={resaleForm.askingPrice}
            onChange={(v) => setResaleForm((f) => ({ ...f, askingPrice: v }))}
            placeholder="5000000"
          />
        </Field>
        <Field label="Notes">
          <TextareaInput
            value={resaleForm.notes}
            onChange={(v) => setResaleForm((f) => ({ ...f, notes: v }))}
          />
        </Field>
      </EditSheet>

    </div>
  );
}
