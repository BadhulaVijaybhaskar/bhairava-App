import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

type AnyRow = Record<string, any>;

/** Multi-step customer onboarding — identity → address/KYC → preferences → agent/docs/notes */
export function CustomerOnboardingPage() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [agents, setAgents] = useState<AnyRow[]>([]);
  const [projects, setProjects] = useState<AnyRow[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', city: '', state: 'Telangana', pincode: '',
    pan: '', aadhaar: '', kycStatus: 'PENDING',
    agentId: '', notes: '', source: 'Walk-in',
    interestedProjectId: '',
  });

  useEffect(() => {
    (api as any).agents.list().then(setAgents).catch(() => setAgents([]));
    api.projects.list().then((r: any) => setProjects(Array.isArray(r) ? r : [])).catch(() => setProjects([]));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(''); setMsg('');
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
      } as any);
      setMsg('Customer created on live API (PII encrypted)');
      nav(`/customers/${(created as any).id}`);
    } catch (ex: any) {
      setErr(ex.message || String(ex));
    }
  }

  const steps = ['Identity & contact', 'Address & KYC', 'Preferences & agent', 'Review'];

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Customer onboarding</h1>
          <p className="muted">Full wizard → production API (no localStorage business SoT)</p>
        </div>
        <Link className="btn ghost" to="/customers">Cancel</Link>
      </div>
      <div className="tabs">
        {steps.map((s, i) => (
          <button key={s} type="button" className={step === i ? 'active' : ''} onClick={() => setStep(i)}>{i + 1}. {s}</button>
        ))}
      </div>
      <form className="card" onSubmit={submit}>
        {step === 0 && (
          <div className="row">
            <div><label>Full name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label>Phone</label><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label>Source</label><input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
          </div>
        )}
        {step === 1 && (
          <div className="row">
            <div style={{ flex: '1 1 100%' }}><label>Address</label><textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><label>State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div><label>Pincode</label><input value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
            <div><label>PAN</label><input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></div>
            <div><label>Aadhaar</label><input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} /></div>
            <div><label>KYC status</label>
              <select value={form.kycStatus} onChange={(e) => setForm({ ...form, kycStatus: e.target.value })}>
                <option value="PENDING">PENDING</option>
                <option value="SUBMITTED">SUBMITTED</option>
                <option value="VERIFIED">VERIFIED</option>
              </select>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="row">
            <div><label>Interested project</label>
              <select value={form.interestedProjectId} onChange={(e) => setForm({ ...form, interestedProjectId: e.target.value })}>
                <option value="">—</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div><label>Assigned agent</label>
              <select value={form.agentId} onChange={(e) => setForm({ ...form, agentId: e.target.value })}>
                <option value="">—</option>
                {agents.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.code})</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 100%' }}><label>Notes</label><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
        )}
        {step === 3 && (
          <div>
            <p><strong>{form.name}</strong> · {form.phone} · {form.email || 'no email'}</p>
            <p className="muted">{form.address}, {form.city}, {form.state} {form.pincode}</p>
            <p className="muted">KYC {form.kycStatus} · Agent {form.agentId || 'unassigned'} · Project interest {form.interestedProjectId || '—'}</p>
            <p className="muted">Documents can be attached after create via Documents module (presigned MinIO).</p>
          </div>
        )}
        {err ? <p className="err">{err}</p> : null}
        {msg ? <p className="ok">{msg}</p> : null}
        <div className="row" style={{ marginTop: 12 }}>
          {step > 0 ? <button type="button" className="btn ghost" onClick={() => setStep(step - 1)}>Back</button> : null}
          {step < 3 ? <button type="button" className="btn" onClick={() => setStep(step + 1)}>Continue</button> : <button type="submit" className="btn" data-testid="customer-onboard-save">Create customer</button>}
        </div>
      </form>
    </div>
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

  useEffect(() => {
    api.leads.list().then((r: any) => setLeads(Array.isArray(r) ? r : [])).catch(() => setLeads([]));
    api.customers.list().then((r: any) => setCustomers(Array.isArray(r) ? r : [])).catch(() => setCustomers([]));
    api.projects.list().then((r: any) => setProjects(Array.isArray(r) ? r : [])).catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (!projectId) { setPlots([]); return; }
    api.plots.listByProject(projectId).then((r: any) => setPlots(Array.isArray(r) ? r : [])).catch(() => setPlots([]));
  }, [projectId]);

  function push(s: string) { setLog((prev) => [...prev, s]); }

  async function runChain(e: FormEvent) {
    e.preventDefault();
    setErr(''); setLog([]);
    try {
      if (leadId) {
        await (api.leads as any).updateStage(leadId, 'QUALIFIED');
        push('Lead marked QUALIFIED');
      }
      const visit = await api.visits.create({
        projectId,
        customerId: customerId || undefined,
        leadId: leadId || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
      } as any);
      push('Site visit created: ' + (visit as any).id);
      if (!customerId) throw new Error('Select or create a customer before reserve/book');
      const available = plots.find((p) => p.id === plotId) || plots.find((p) => p.status === 'AVAILABLE');
      if (!available) throw new Error('No AVAILABLE plot selected');
      const reservation = await api.reservations.create({ plotId: available.id, customerId });
      push('Reserved plot ' + available.number + ' → ' + (reservation as any).id);
      const booking = await api.bookings.create({
        plotId: available.id,
        customerId,
        reservationId: (reservation as any).id,
        agreementValuePaise: '200000000',
        advancePaise: '1000000',
      } as any);
      push('Booked → ' + (booking as any).id);
    } catch (ex: any) {
      setErr(ex.message || String(ex));
    }
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h1>Lead conversion chain</h1>
          <p className="muted">Lead → Site Visit → Customer → Reserve → Book (all live API)</p>
        </div>
      </div>
      <form className="card" onSubmit={runChain}>
        <div className="row">
          <div><label>Lead</label>
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              <option value="">— optional —</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.stage})</option>)}
            </select>
          </div>
          <div><label>Customer</label>
            <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select…</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label>Project</label>
            <select required value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label>Plot</label>
            <select value={plotId} onChange={(e) => setPlotId(e.target.value)}>
              <option value="">First AVAILABLE</option>
              {plots.map((p) => <option key={p.id} value={p.id}>{p.number || p.plotNumber} ({p.status})</option>)}
            </select>
          </div>
          <div><label>Visit at</label><input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
        </div>
        <p className="muted">Need a new customer? Use <Link to="/customers/onboarding">Customer onboarding</Link> first.</p>
        <button className="btn" type="submit" data-testid="run-conversion">Run conversion</button>
        {err ? <p className="err">{err}</p> : null}
        <ul>{log.map((l, i) => <li key={i} className="ok">{l}</li>)}</ul>
      </form>
    </div>
  );
}
