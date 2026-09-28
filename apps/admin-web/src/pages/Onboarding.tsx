import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, CircleCheck, Play, UserPlus, X } from 'lucide-react';
import {
  Btn,
  ChoiceGrid,
  Field,
  LinkBtn,
  PageHeader,
  Panel,
  SectionTitle,
  SelectInput,
  TextInput,
  TextareaInput,
  cn,
} from '@bhairava/ui-web';
import { api } from '../api';
import { Fact, FormActions, FormGrid, Notice } from '../components/common';
import { DASH, errMsg, humanize, type AnyRow } from '../lib/data';

const STEPS = ['Identity & contact', 'Address & KYC', 'Preferences & agent', 'Review'] as const;

function Stepper({ step, onStep }: { step: number; onStep: (i: number) => void }) {
  return (
    <ol className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((s, i) => {
        const state = i < step ? 'done' : i === step ? 'active' : 'todo';
        return (
          <li key={s}>
            <button
              type="button"
              onClick={() => onStep(i)}
              aria-current={state === 'active' ? 'step' : undefined}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition-colors',
                state === 'active' ? 'bg-surface-lowest text-foreground shadow-ambient' : 'bg-surface-low text-muted-foreground hover:bg-surface-c',
              )}
            >
              <span
                className={cn(
                  'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold',
                  state === 'done' && 'gradient-primary text-primary-foreground',
                  state === 'active' && 'bg-primary/12 text-primary',
                  state === 'todo' && 'bg-surface-c',
                )}
              >
                {state === 'done' ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className="truncate">{s}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Multi-step customer onboarding — identity → address/KYC → preferences → agent/docs/notes */
export function CustomerOnboardingPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [agents, setAgents] = useState<AnyRow[]>([]);
  const [projects, setProjects] = useState<AnyRow[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', city: '', state: 'Telangana', pincode: '',
    pan: '', aadhaar: '', kycStatus: 'PENDING',
    agentId: '', notes: '', source: 'Walk-in',
    interestedProjectId: '',
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    api.agents.list().then((r) => setAgents(Array.isArray(r) ? r : [])).catch(() => setAgents([]));
    api.projects.list().then((r) => setProjects(Array.isArray(r) ? r : [])).catch(() => setProjects([]));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    setErr(''); setMsg('');
    setSaving(true);
    try {
      const created = await api.customers.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
        address: form.address || undefined,
        state: form.state || undefined,
        pincode: form.pincode || undefined,
        kycStatus: form.kycStatus || undefined,
        agentId: form.agentId || undefined,
        notes: [form.notes, form.interestedProjectId ? `Interested project: ${form.interestedProjectId}` : ''].filter(Boolean).join('\n') || undefined,
        source: form.source || undefined,
        ...(form.pan ? { pan: form.pan } : {}),
        ...(form.aadhaar ? { aadhaar: form.aadhaar } : {}),
      } as Parameters<typeof api.customers.create>[0]);
      setMsg('Customer created on live API (PII encrypted)');
      nav(`/customers/${(created as AnyRow).id}`);
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setSaving(false);
    }
  }

  const agentName = agents.find((a) => a.id === form.agentId);
  const projectName = projects.find((p) => p.id === form.interestedProjectId);

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="New customer"
        description="Four-step onboarding straight to the production API. PAN and Aadhaar are encrypted at rest."
        actions={<LinkBtn to="/customers"><X className="h-4 w-4" /> Cancel</LinkBtn>}
      />
      <Stepper step={step} onStep={setStep} />
      <Panel>
        <form onSubmit={submit}>
          <SectionTitle aside={`Step ${step + 1} of ${STEPS.length}`}>{STEPS[step]}</SectionTitle>
          {step === 0 && (
            <FormGrid className="lg:grid-cols-2">
              <Field label="Full name" required><TextInput required value={form.name} onChange={(v) => set({ name: v })} /></Field>
              <Field label="Phone" required><TextInput required type="tel" value={form.phone} onChange={(v) => set({ phone: v })} /></Field>
              <Field label="Email"><TextInput type="email" value={form.email} onChange={(v) => set({ email: v })} /></Field>
              <Field label="Source"><TextInput value={form.source} onChange={(v) => set({ source: v })} /></Field>
            </FormGrid>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Address"><TextareaInput rows={2} value={form.address} onChange={(v) => set({ address: v })} /></Field>
              <FormGrid>
                <Field label="City"><TextInput value={form.city} onChange={(v) => set({ city: v })} /></Field>
                <Field label="State"><TextInput value={form.state} onChange={(v) => set({ state: v })} /></Field>
                <Field label="Pincode"><TextInput inputMode="numeric" value={form.pincode} onChange={(v) => set({ pincode: v })} /></Field>
                <Field label="PAN"><TextInput autoComplete="off" value={form.pan} onChange={(v) => set({ pan: v })} /></Field>
                <Field label="Aadhaar"><TextInput autoComplete="off" value={form.aadhaar} onChange={(v) => set({ aadhaar: v })} /></Field>
              </FormGrid>
              <Field label="KYC status">
                <ChoiceGrid
                  value={form.kycStatus}
                  onChange={(v) => set({ kycStatus: v })}
                  options={[
                    { value: 'PENDING', label: 'Pending', hint: 'Documents not yet received' },
                    { value: 'SUBMITTED', label: 'Submitted', hint: 'Awaiting verification' },
                    { value: 'VERIFIED', label: 'Verified', hint: 'KYC complete' },
                  ]}
                />
              </Field>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <FormGrid className="lg:grid-cols-2">
                <Field label="Interested project">
                  <SelectInput
                    value={form.interestedProjectId}
                    onChange={(v) => set({ interestedProjectId: v })}
                    options={[{ value: '', label: DASH }, ...projects.map((p) => ({ value: String(p.id), label: String(p.name) }))]}
                  />
                </Field>
                <Field label="Assigned agent">
                  <SelectInput
                    value={form.agentId}
                    onChange={(v) => set({ agentId: v })}
                    options={[{ value: '', label: 'Unassigned' }, ...agents.map((a) => ({ value: String(a.id), label: `${a.name} (${a.code})` }))]}
                  />
                </Field>
              </FormGrid>
              <Field label="Notes"><TextareaInput rows={3} value={form.notes} onChange={(v) => set({ notes: v })} /></Field>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface-low p-4 lg:grid-cols-4">
                <Fact label="Name">{form.name || DASH}</Fact>
                <Fact label="Phone">{form.phone || DASH}</Fact>
                <Fact label="Email">{form.email || 'No email'}</Fact>
                <Fact label="Source">{form.source || DASH}</Fact>
                <Fact label="Address">{[form.address, form.city, form.state, form.pincode].filter(Boolean).join(', ') || DASH}</Fact>
                <Fact label="KYC">{humanize(form.kycStatus)}</Fact>
                <Fact label="Agent">{agentName ? String(agentName.name) : 'Unassigned'}</Fact>
                <Fact label="Project interest">{projectName ? String(projectName.name) : DASH}</Fact>
              </div>
              <p className="text-sm text-muted-foreground">
                Documents can be attached after creation via the <Link to="/documents" className="font-medium text-primary">Documents</Link> module (presigned uploads).
              </p>
            </div>
          )}
          <div className="space-y-2 pt-4 empty:hidden">
            <Notice tone="err">{err}</Notice>
            <Notice tone="ok">{msg}</Notice>
          </div>
          <FormActions className="justify-between">
            {step > 0 ? (
              <Btn onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Back</Btn>
            ) : <span />}
            {step < STEPS.length - 1 ? (
              <Btn type="submit" variant="primary">Continue <ArrowRight className="h-4 w-4" /></Btn>
            ) : (
              <Btn type="submit" variant="primary" disabled={saving} data-testid="customer-onboard-save">
                <UserPlus className="h-4 w-4" /> {saving ? 'Creating…' : 'Create customer'}
              </Btn>
            )}
          </FormActions>
        </form>
      </Panel>
    </>
  );
}

/** Lead → Visit → Customer → Reserve → Book conversion chain */
export function LeadConversionPage() {
  const [leads, setLeads] = useState<AnyRow[]>([]);
  const [customers, setCustomers] = useState<AnyRow[]>([]);
  const [projects, setProjects] = useState<AnyRow[]>([]);
  const [plots, setPlots] = useState<AnyRow[]>([]);
  const [leadId, setLeadId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [scheduledAt, setScheduledAt] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [log, setLog] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.leads.list().then((r) => setLeads(Array.isArray(r) ? r : [])).catch(() => setLeads([]));
    api.customers.list().then((r) => setCustomers(Array.isArray(r) ? r : [])).catch(() => setCustomers([]));
    api.projects.list().then((r) => setProjects(Array.isArray(r) ? r : [])).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (!projectId) { setPlots([]); return; }
    api.plots.listByProject(projectId).then((r) => setPlots(Array.isArray(r) ? r : [])).catch(() => setPlots([]));
  }, [projectId]);

  function push(s: string) { setLog((prev) => [...prev, s]); }

  async function runChain(e: FormEvent) {
    e.preventDefault();
    setErr(''); setLog([]);
    setRunning(true);
    try {
      if (leadId) {
        await api.leads.updateStage(leadId, 'QUALIFIED');
        push('Lead marked QUALIFIED');
      }
      const visit = await api.visits.create({
        projectId,
        customerId: customerId || undefined,
        leadId: leadId || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      push('Site visit created: ' + (visit as AnyRow).id);
      if (!customerId) throw new Error('Select or create a customer before reserve/book');
      const available = plots.find((p) => p.id === plotId) || plots.find((p) => p.status === 'AVAILABLE');
      if (!available) throw new Error('No AVAILABLE plot selected');
      const reservation = await api.reservations.create({ plotId: available.id, customerId });
      push('Reserved plot ' + available.number + ' → ' + (reservation as AnyRow).id);
      const booking = await api.bookings.create({
        plotId: available.id,
        customerId,
        reservationId: (reservation as AnyRow).id,
        agreementValuePaise: '200000000',
        advancePaise: '1000000',
      });
      push('Booked → ' + (booking as AnyRow).id);
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="Lead conversion"
        description="Lead → Site visit → Customer → Reserve → Book, executed step by step against the live API."
        actions={<LinkBtn to="/customers/onboarding" variant="tonal"><UserPlus className="h-4 w-4" /> New customer</LinkBtn>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <SectionTitle>Chain inputs</SectionTitle>
          <form onSubmit={runChain}>
            <FormGrid className="lg:grid-cols-2">
              <Field label="Lead" hint="Optional — marked QUALIFIED first">
                <SelectInput
                  value={leadId}
                  onChange={setLeadId}
                  options={[{ value: '', label: '— optional —' }, ...leads.map((l) => ({ value: String(l.id), label: `${l.name} (${humanize(l.stage)})` }))]}
                />
              </Field>
              <Field label="Customer" required>
                <SelectInput
                  value={customerId}
                  onChange={setCustomerId}
                  placeholder="Select…"
                  options={customers.map((c) => ({ value: String(c.id), label: String(c.name) }))}
                />
              </Field>
              <Field label="Project" required>
                <SelectInput
                  value={projectId}
                  onChange={(v) => { setProjectId(v); setPlotId(''); }}
                  placeholder="Select…"
                  options={projects.map((p) => ({ value: String(p.id), label: String(p.name) }))}
                />
              </Field>
              <Field label="Plot">
                <SelectInput
                  value={plotId}
                  onChange={setPlotId}
                  options={[{ value: '', label: 'First AVAILABLE' }, ...plots.map((p) => ({ value: String(p.id), label: `${p.number || p.plotNumber} (${humanize(p.status)})` }))]}
                />
              </Field>
              <Field label="Visit at">
                <TextInput type="datetime-local" value={scheduledAt} onChange={setScheduledAt} />
              </Field>
            </FormGrid>
            <FormActions>
              <Btn type="submit" variant="primary" disabled={running || !projectId || !customerId} data-testid="run-conversion">
                <Play className="h-4 w-4" /> {running ? 'Running…' : 'Run conversion'}
              </Btn>
              <span className="text-xs text-muted-foreground">
                Need a new customer? Use <Link to="/customers/onboarding" className="font-medium text-primary">Customer onboarding</Link> first.
              </span>
            </FormActions>
          </form>
        </Panel>
        <Panel>
          <SectionTitle aside={log.length ? `${log.length} steps` : undefined}>Run log</SectionTitle>
          {log.length === 0 && !err ? (
            <p className="text-sm text-muted-foreground">Each API step is logged here as it completes.</p>
          ) : (
            <ol className="space-y-2">
              {log.map((l, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="break-all">{l}</span>
                </li>
              ))}
            </ol>
          )}
          <Notice tone="err" className="mt-3">{err}</Notice>
        </Panel>
      </div>
    </>
  );
}
