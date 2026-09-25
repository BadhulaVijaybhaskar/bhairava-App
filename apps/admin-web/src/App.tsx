import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { api, tokens } from './api';
import { PlotCanvas, type CanvasTool, type CanvasPlot } from './PlotCanvas';
import { ReceiptDetailPage, ReceiptsListPage } from './pages/Receipts';
import { NotificationsPage } from './pages/Notifications';
import { CustomerOnboardingPage, LeadConversionPage } from './pages/Onboarding';
import { ProjectWorkspacePage } from './pages/ProjectSetup';
import { isMappedPolygon, type NormPoint } from '@bhairava/domain';

type AnyRow = Record<string, any>;

function useAuthed() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    void Promise.resolve(tokens.getAccessToken()).then((t: string | null) => {
      setAuthed(!!t);
      setReady(true);
    });
  }, []);
  return { ready, authed, setAuthed };
}

function useAsyncList(loader: () => Promise<AnyRow[]>, deps: unknown[] = []) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    setErr('');
    loader()
      .then(setRows)
      .catch((e) => setErr(String((e as Error).message || e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    reload();
  }, [reload]);
  return { rows, err, loading, reload };
}

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    try {
      const session = await api.auth.login(email, password);
      await tokens.setTokens(session.accessToken, session.refreshToken ?? null);
      nav('/');
    } catch (ex: any) {
      setErr(ex?.message || 'Login failed');
    }
  }
  return (
    <div className="card login">
      <h1>Bhairava Admin</h1>
      <p className="muted">Live API only — sign in with your organization credentials.</p>
      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="admin-email" />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="admin-password" />
        {err ? <p className="err">{err}</p> : null}
        <button className="btn" data-testid="admin-login">Sign in</button>
      </form>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { ready, authed } = useAuthed();
  if (!ready) return <div className="main">Loadingâ€¦</div>;
  if (!authed) return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">Bhairava <span>Admin</span></div>
        <p className="muted" style={{ color: '#9fb5a8', padding: '0 .6rem' }}>Production API Â· desktop-first</p>
        <div className="section">Overview</div>
        <NavLink to="/" end>Dashboard</NavLink>
        <div className="section">Inventory</div>
        <NavLink to="/projects">Projects</NavLink>
        <NavLink to="/plots">Plots</NavLink>
        <NavLink to="/layouts">Layouts</NavLink>
        <div className="section">CRM / Sales</div>
        <NavLink to="/customers">Customers</NavLink>
        <NavLink to="/customers/onboarding">Customer onboarding</NavLink>
        <NavLink to="/conversion">Lead conversion</NavLink>
        <NavLink to="/leads">Leads</NavLink>
        <NavLink to="/visits">Site visits</NavLink>
        <NavLink to="/reservations">Reservations</NavLink>
        <NavLink to="/bookings">Bookings</NavLink>
        <div className="section">Finance</div>
        <NavLink to="/payments">Payments</NavLink>
        <NavLink to="/receipts">Receipts</NavLink>
        <NavLink to="/commissions">Commissions</NavLink>
        <NavLink to="/collections">Collections</NavLink>
        <div className="section">Ops</div>
        <NavLink to="/documents">Documents</NavLink>
        <NavLink to="/registrations">Registrations</NavLink>
        <NavLink to="/resale">Resale</NavLink>
        <NavLink to="/agents">Agents</NavLink>
        <NavLink to="/notifications">Notifications</NavLink>
        <div className="section">Reports</div>
        <NavLink to="/reports/sales">Sales</NavLink>
        <NavLink to="/reports/inventory">Inventory</NavLink>
        <NavLink to="/reports/collections">Collections</NavLink>
        <div className="section">Settings</div>
        <NavLink to="/settings/company">Company</NavLink>
        <NavLink to="/settings/users">Users</NavLink>
        <NavLink to="/settings/audit">Audit</NavLink>
        <NavLink to="/settings/billing">Billing</NavLink>
        <NavLink to="/settings/danger">Founder danger zone</NavLink>
        <button
          className="btn secondary"
          style={{ marginTop: 16, width: '100%' }}
          onClick={async () => {
            try { await api.auth.logout(); } catch { /* ignore */ }
            await tokens.clear();
            location.href = '/login';
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <div className="topbar"><h1>{title}</h1></div>
      <div className="card"><p className="muted">{note}</p></div>
    </div>
  );
}

function ResourceTable({
  title,
  loader,
  columns,
}: {
  title: string;
  loader: () => Promise<AnyRow[]>;
  columns: Array<{ key: string; label: string }>;
}) {
  const { rows, err } = useAsyncList(loader);
  return (
    <div>
      <div className="topbar"><h1>{title}</h1></div>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={r.id || idx}>
                {columns.map((c) => <td key={c.key}>{String(r[c.key] ?? 'â€”')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !err ? <p className="muted">No rows from API.</p> : null}
      </div>
    </div>
  );
}

function DashboardPage() {
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const customers = useAsyncList(() => api.customers.list() as Promise<AnyRow[]>);
  const payments = useAsyncList(() => api.payments.list() as Promise<AnyRow[]>);
  const leads = useAsyncList(() => api.leads.list() as Promise<AnyRow[]>);
  return (
    <div>
      <div className="topbar"><h1>Dashboard</h1><span className="muted">Live API counts</span></div>
      <div className="grid">
        <div className="stat"><div className="k">Projects</div><div className="v">{projects.rows.length}</div></div>
        <div className="stat"><div className="k">Customers</div><div className="v">{customers.rows.length}</div></div>
        <div className="stat"><div className="k">Leads</div><div className="v">{leads.rows.length}</div></div>
        <div className="stat"><div className="k">Payments</div><div className="v">{payments.rows.length}</div></div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h2>Projects</h2>
        {projects.err ? <p className="err">{projects.err}</p> : null}
        <table>
          <thead><tr><th>Name</th><th>Code</th><th>City</th><th>Status</th><th /></tr></thead>
          <tbody>
            {projects.rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.code}</td><td>{p.city}</td>
                <td><span className="chip">{p.lifecycleStatus || p.status}</span></td>
                <td><Link to={`/projects/${p.id}`}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const { rows, err, reload } = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const [form, setForm] = useState({ name: '', code: '', city: '' });
  const [msg, setMsg] = useState('');
  async function create(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await (api.projects as any).create({ name: form.name, code: form.code, city: form.city || undefined });
      setForm({ name: '', code: '', city: '' });
      setMsg('Created as DRAFT — open Workspace to complete setup');
      reload();
    } catch (ex: any) {
      setMsg(ex.message || String(ex));
    }
  }
  return (
    <div>
      <div className="topbar"><h1>Projects</h1></div>
      <div className="card">
        <h2>Create project</h2>
        <form className="row" onSubmit={create}>
          <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Code</label><input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
          <div><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <button className="btn" type="submit">Create</button>
        </form>
        {msg ? <p className="muted">{msg}</p> : null}
      </div>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        <table data-testid="admin-projects">
          <thead><tr><th>Name</th><th>Code</th><th>City</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.code}</td><td>{p.city}</td>
                <td><span className="chip">{p.lifecycleStatus || p.status}</span></td>
                <td>
                  <Link to={`/projects/${p.id}`}>Workspace</Link>
                  {' Â· '}
                  <Link to={`/projects/${p.id}/plots`}>Plots</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProjectWorkspace() {
  const { projectId } = useParams();
  const [project, setProject] = useState<AnyRow | null>(null);
  const [tab, setTab] = useState('overview');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!projectId) return;
    (api.projects as any).get(projectId).then(setProject).catch((e: any) => setErr(String(e.message || e)));
  }, [projectId]);
  const tabs = ['overview', 'setup', 'pricing', 'amenities', 'visibility', 'layout', 'sales', 'finance', 'documents'];
  return (
    <div>
      <div className="topbar">
        <div>
          <h1>{project?.name || 'Project'}</h1>
          <p className="muted">{project?.code} Â· {project?.city}</p>
        </div>
        <Link className="btn ghost" to="/projects">Back</Link>
      </div>
      {err ? <p className="err">{err}</p> : null}
      <div className="tabs">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="card">
        {tab === 'overview' && (
          <div>
            <p>Lifecycle: <span className="chip">{project?.lifecycleStatus || project?.status}</span></p>
            <p className="muted">Mutations go through production API. Monorepo apps/* is production SoT.</p>
            <p><Link to={`/projects/${projectId}/plots`}>Open plot inventory â†’</Link></p>
          </div>
        )}
        {tab === 'documents' && <DocumentsPage projectId={projectId} />}
        {tab !== 'overview' && tab !== 'documents' && (
          <p className="muted">
            â€œ{tab}â€ maps to production project workspace tabs. Persist via PATCH /api/projects/:id â€” no localStorage business SoT.
          </p>
        )}
      </div>
    </div>
  );
}

function PlotsPage() {
  const params = useParams();
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const [selected, setSelected] = useState(params.projectId || '');
  const [customerId, setCustomerId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [plots, setPlots] = useState<AnyRow[]>([]);
  useEffect(() => {
    if (!selected && projects.rows[0]?.id) setSelected(projects.rows[0].id);
  }, [projects.rows, selected]);
  useEffect(() => {
    if (!selected) return;
    api.plots.listByProject(selected).then(setPlots).catch((e) => setErr(String(e.message || e)));
  }, [selected]);
  async function reserve(plotId: string) {
    setMsg(''); setErr('');
    try {
      await api.reservations.create({ plotId, customerId });
      setMsg('Reserved');
      setPlots(await api.plots.listByProject(selected));
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  async function book(plotId: string) {
    setMsg(''); setErr('');
    try {
      await api.bookings.create({
        plotId,
        customerId,
        agreementValuePaise: '200000000',
        advancePaise: '1000000',
      } as any);
      setMsg('Booked');
      setPlots(await api.plots.listByProject(selected));
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  return (
    <div>
      <div className="topbar"><h1>Plots</h1></div>
      <div className="card row">
        <div>
          <label>Project</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {projects.rows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label>Customer id</label>
          <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} data-testid="reserve-customer-id" />
        </div>
      </div>
      {msg ? <p className="ok">{msg}</p> : null}
      {err ? <p className="err">{err}</p> : null}
      <div className="card">
        <table data-testid="admin-plots">
          <thead><tr><th>#</th><th>Status</th><th>Area</th><th>Price</th><th>Actions</th></tr></thead>
          <tbody>
            {plots.map((p) => (
              <tr key={p.id}>
                <td>{p.number || p.plotNumber}</td>
                <td><span className="chip">{p.status}</span></td>
                <td>{String(p.areaSqYd ?? p.area ?? 'â€”')}</td>
                <td>{p.totalPrice == null ? 'â€”' : String(p.totalPrice)}</td>
                <td>
                  <button className="btn secondary" disabled={!customerId} onClick={() => reserve(p.id)}>Reserve</button>{' '}
                  <button className="btn" disabled={!customerId} onClick={() => book(p.id)}>Book</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomersPage() {
  const { rows, err, reload } = useAsyncList(() => api.customers.list() as Promise<AnyRow[]>);
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', pan: '', aadhaar: '' });
  const [msg, setMsg] = useState('');
  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await api.customers.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        city: form.city || undefined,
        ...(form.pan ? { pan: form.pan } : {}),
        ...(form.aadhaar ? { aadhaar: form.aadhaar } : {}),
      } as any);
      setForm({ name: '', phone: '', email: '', city: '', pan: '', aadhaar: '' });
      setMsg('Created (PII encrypted at rest)');
      reload();
    } catch (ex: any) { setMsg(ex.message || String(ex)); }
  }
  return (
    <div>
      <div className="topbar"><h1>Customers</h1></div>
      <div className="card">
        <h2>Create</h2>
        <form onSubmit={create} className="row">
          <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Phone</label><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div><label>PAN</label><input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></div>
          <div><label>Aadhaar</label><input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} /></div>
          <button className="btn" type="submit">Save</button>
        </form>
        {msg ? <p className="muted">{msg}</p> : null}
      </div>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>PAN</th><th>Aadhaar</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.city}</td>
                <td>{c.panMasked || (c.hasPan ? 'â€¢â€¢â€¢â€¢' : 'â€”')}</td>
                <td>{c.aadhaarMasked || (c.hasAadhaar ? 'â€¢â€¢â€¢â€¢' : 'â€”')}</td>
                <td><Link to={`/customers/${c.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerDetail() {
  const { customerId } = useParams();
  const [row, setRow] = useState<AnyRow | null>(null);
  const [revealed, setRevealed] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!customerId) return;
    api.customers.get(customerId).then(setRow).catch((e) => setErr(String(e.message || e)));
  }, [customerId]);
  async function reveal(field: 'pan' | 'aadhaar') {
    setErr(''); setRevealed('');
    try {
      const access = await tokens.getAccessToken();
      const base = (import.meta as any).env.VITE_API_BASE_URL || '';
      const res = await fetch(`${base}/api/customers/${customerId}/pii?field=${field}`, {
        headers: { authorization: `Bearer ${access}` },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || res.statusText);
      setRevealed(`${field}: ${body.value}`);
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  return (
    <div>
      <div className="topbar"><h1>{row?.name || 'Customer'}</h1><Link to="/customers">Back</Link></div>
      {err ? <p className="err">{err}</p> : null}
      <div className="card">
        <p>Phone: {row?.phone}</p>
        <p>Email: {row?.email}</p>
        <p>City: {row?.city}</p>
        <p>PAN (masked): {row?.panMasked || 'â€”'}</p>
        <p>Aadhaar (masked): {row?.aadhaarMasked || 'â€”'}</p>
        <button className="btn secondary" onClick={() => reveal('pan')}>Reveal PAN</button>{' '}
        <button className="btn secondary" onClick={() => reveal('aadhaar')}>Reveal Aadhaar</button>
        {revealed ? <p className="ok">{revealed}</p> : null}
      </div>
    </div>
  );
}

function DocumentsPage({ projectId }: { projectId?: string }) {
  const { rows, err, reload } = useAsyncList(
    () => api.documents.list(projectId ? { projectId } : undefined) as Promise<AnyRow[]>,
    [projectId],
  );
  const [msg, setMsg] = useState('');
  async function createDoc() {
    setMsg('');
    try {
      const created = await api.documents.create({
        title: 'Admin upload ' + new Date().toISOString(),
        visibility: 'INTERNAL',
        originalName: 'note.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 16,
        projectId,
      } as any);
      const url = (created as any)?.upload?.uploadUrl;
      if (url) {
        await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: '%PDF-1.4 admin' });
      }
      setMsg('Uploaded via presigned URL');
      reload();
    } catch (e: any) { setMsg(e.message || String(e)); }
  }
  async function download(id: string) {
    const res = await api.documents.download(id);
    const url = (res as any)?.download?.downloadUrl;
    if (url) window.open(url, '_blank');
  }
  return (
    <div>
      {!projectId ? <div className="topbar"><h1>Documents</h1></div> : <h2>Documents</h2>}
      <div className="card">
        <button className="btn" onClick={createDoc}>Create + upload test PDF</button>
        {msg ? <p className="muted">{msg}</p> : null}
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr><th>Title</th><th>Visibility</th><th>Version</th><th /></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td>{d.title}</td>
                <td><span className="chip">{d.visibility}</span></td>
                <td>{d.version}</td>
                <td><button className="btn ghost" onClick={() => download(d.id)}>Download</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditPage() {
  const { rows, err } = useAsyncList(async () => {
    const res = await (api as any).audit.list({ take: 100 });
    return Array.isArray(res) ? res : res?.items || [];
  });
  return (
    <div>
      <div className="topbar"><h1>Audit log</h1></div>
      <div className="card">
        <p className="muted">Append-only trail from production API.</p>
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Actor</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.createdAt}</td>
                <td>{r.action}</td>
                <td>{r.entityType} {r.entityId}</td>
                <td>{r.actorId || 'â€”'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



function ProjectSetupForm({ projectId, project, onSaved }: { projectId: string; project: AnyRow | null; onSaved: (p: AnyRow) => void }) {
  const [form, setForm] = useState({ name: '', city: '', state: '', location: '', description: '', reraNumber: '', lifecycleStatus: '' });
  const [msg, setMsg] = useState('');
  useEffect(() => {
    if (!project) return;
    setForm({
      name: project.name || '',
      city: project.city || '',
      state: project.state || '',
      location: project.location || '',
      description: project.description || '',
      reraNumber: project.reraNumber || '',
      lifecycleStatus: project.lifecycleStatus || project.status || '',
    });
  }, [project]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      const updated = await (api.projects as any).update(projectId, form);
      onSaved(updated);
      setMsg('Saved via PATCH /api/projects/:id');
    } catch (ex: any) { setMsg(ex.message || String(ex)); }
  }
  return (
    <form onSubmit={save} className="row">
      <div><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
      <div><label>State</label><input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
      <div><label>Location</label><input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
      <div><label>RERA</label><input value={form.reraNumber} onChange={(e) => setForm({ ...form, reraNumber: e.target.value })} /></div>
      <div><label>Lifecycle</label><input value={form.lifecycleStatus} onChange={(e) => setForm({ ...form, lifecycleStatus: e.target.value })} /></div>
      <div style={{ flex: '1 1 100%' }}><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
      <button className="btn" type="submit">Save setup</button>
      {msg ? <p className="muted">{msg}</p> : null}
    </form>
  );
}

function CompanySettingsPage() {
  const [json, setJson] = useState('{}');
  const [msg, setMsg] = useState('');
  useEffect(() => {
    (api as any).companySettings.get().then((r: any) => setJson(JSON.stringify(r.settingsJson ?? r.settings ?? {}, null, 2))).catch((e: any) => setMsg(String(e.message || e)));
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      await (api as any).companySettings.update(JSON.parse(json));
      setMsg('Saved to production API');
    } catch (ex: any) { setMsg(ex.message || String(ex)); }
  }
  return (
    <div>
      <div className="topbar"><h1>Company settings</h1></div>
      <div className="card">
        <p className="muted">Live company_settings row — no localStorage SoT.</p>
        <form onSubmit={save}>
          <label>settingsJson</label>
          <textarea rows={16} value={json} onChange={(e) => setJson(e.target.value)} style={{ width: '100%', fontFamily: 'ui-monospace, monospace' }} />
          <button className="btn" type="submit">Save</button>
        </form>
        {msg ? <p className="muted">{msg}</p> : null}
      </div>
    </div>
  );
}

function ReportsPage({ focus }: { focus: 'sales' | 'inventory' | 'collections' }) {
  const [data, setData] = useState<AnyRow | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    (api as any).reports.summary().then(setData).catch((e: any) => setErr(String(e.message || e)));
  }, []);
  const inv = (data?.inventoryByStatus as AnyRow[]) || [];
  return (
    <div>
      <div className="topbar"><h1>{focus} report</h1></div>
      {err ? <p className="err">{err}</p> : null}
      <div className="grid">
        <div className="stat"><div className="k">Projects</div><div className="v">{String(data?.projects ?? '—')}</div></div>
        <div className="stat"><div className="k">Bookings</div><div className="v">{String(data?.bookings ?? '—')}</div></div>
        <div className="stat"><div className="k">Active reservations</div><div className="v">{String(data?.activeReservations ?? '—')}</div></div>
        <div className="stat"><div className="k">Collections (paise)</div><div className="v">{String((data?.collections as any)?.amountPaise ?? '—')}</div></div>
      </div>
      <div className="card">
        <h2>Inventory by status</h2>
        <table>
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>{inv.map((r, i) => <tr key={i}><td>{String(r.status)}</td><td>{String(r.count)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function LayoutsPage() {
  const projects = useAsyncList(() => api.projects.list() as Promise<AnyRow[]>);
  const [projectId, setProjectId] = useState('');
  const [layouts, setLayouts] = useState<AnyRow[]>([]);
  const [plots, setPlots] = useState<AnyRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [tool, setTool] = useState<CanvasTool>('select');
  const [draftPoints, setDraftPoints] = useState<NormPoint[]>([]);
  const [editablePoints, setEditablePoints] = useState<NormPoint[] | null>(null);
  const [layoutImageUrl, setLayoutImageUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!projectId && projects.rows[0]?.id) setProjectId(projects.rows[0].id);
  }, [projects.rows, projectId]);

  const reload = useCallback(() => {
    if (!projectId) return;
    setErr('');
    Promise.all([
      api.layouts.list(projectId),
      api.plots.listByProject(projectId),
    ])
      .then(([l, p]) => {
        setLayouts(Array.isArray(l) ? l : []);
        setPlots(Array.isArray(p) ? p : []);
        const first = Array.isArray(l) ? l[0] : null;
        const meta = first?.metaJson as AnyRow | undefined;
        setLayoutImageUrl((meta?.publicUrl as string) || (meta?.url as string) || null);
      })
      .catch((e) => setErr(String((e as Error).message || e)));
  }, [projectId]);

  useEffect(() => { reload(); }, [reload]);

  const canvasPlots: CanvasPlot[] = plots.map((p) => ({
    id: p.id,
    number: String(p.number || p.plotNumber || ''),
    status: String(p.status || 'AVAILABLE'),
    areaSqYd: p.areaSqYd,
    facing: p.facing,
    polygonJson: p.polygonJson,
  }));

  const selected = plots.find((p) => p.id === selectedId) || null;

  async function savePolygon(points: NormPoint[], replaceExisting = true) {
    if (!selectedId) { setErr('Select a plot first'); return; }
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.plots.setPolygon(selectedId, { points, replaceExisting, layoutId: layouts[0]?.id });
      setMsg('Polygon saved to live API');
      setDraftPoints([]);
      setTool('select');
      setEditablePoints(null);
      reload();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function clearPolygon() {
    if (!selectedId) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      await api.plots.clearPolygon(selectedId);
      setMsg('Polygon cleared');
      setEditablePoints(null);
      reload();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="topbar">
        <h1>Layouts & interactive mapping</h1>
        <button className="btn secondary" onClick={reload} disabled={busy}>Reload</button>
      </div>
      <div className="card row">
        <div>
          <label>Project</label>
          <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setSelectedId(undefined); }}>
            {projects.rows.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label>Tool</label>
          <div className="tabs" style={{ marginBottom: 0 }}>
            {(['pan', 'select', 'draw', 'edit'] as CanvasTool[]).map((t) => (
              <button key={t} type="button" className={tool === t ? 'active' : ''} onClick={() => {
                setTool(t);
                if (t === 'edit' && selected && isMappedPolygon(selected.polygonJson)) {
                  setEditablePoints(selected.polygonJson as NormPoint[]);
                }
                if (t !== 'edit') setEditablePoints(null);
                if (t !== 'draw') setDraftPoints([]);
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>
      {err ? <p className="err">{err}</p> : null}
      {msg ? <p className="ok">{msg}</p> : null}
      <div className="card">
        <h2>Interactive SVG map (live API)</h2>
        <p className="muted">Hit-testing uses domain clientToNormMeet with viewBox 0 0 100 100 and preserveAspectRatio=xMidYMid meet. Draw: click vertices, double-click to complete. Edit: drag vertices then Save.</p>
        <PlotCanvas
          className="plot-canvas-host"
          plots={canvasPlots}
          selectedId={selectedId}
          onSelect={(p) => {
            setSelectedId(p.id);
            setTool('select');
            setEditablePoints(null);
            setDraftPoints([]);
          }}
          layoutImageUrl={layoutImageUrl}
          tool={tool}
          draftPoints={draftPoints}
          onDraftChange={setDraftPoints}
          onDraftComplete={(pts) => { void savePolygon(pts, true); }}
          editablePoints={editablePoints}
          onEditablePointsChange={setEditablePoints}
        />
        <div className="row" style={{ marginTop: '0.75rem' }}>
          <button className="btn" disabled={busy || !selectedId || draftPoints.length < 3} onClick={() => void savePolygon(draftPoints, true)}>Save draft polygon</button>
          <button className="btn gold" disabled={busy || !selectedId || !editablePoints || editablePoints.length < 3} onClick={() => editablePoints && void savePolygon(editablePoints, true)}>Save edited vertices</button>
          <button className="btn danger" disabled={busy || !selectedId || !selected?.polygonJson} onClick={() => void clearPolygon()}>Unlink polygon</button>
          <button className="btn ghost" disabled={!draftPoints.length} onClick={() => setDraftPoints([])}>Clear draft</button>
        </div>
        <p className="muted">Selected: {selected ? (selected.number + ' (' + selected.status + ') — ' + (selected.polygonJson ? 'mapped' : 'unmapped')) : 'none'}</p>
      </div>
      <div className="card">
        <h2>Layouts (API)</h2>
        <table>
          <thead><tr><th>Id</th><th>Name</th><th>Size</th></tr></thead>
          <tbody>
            {layouts.map((l) => (
              <tr key={l.id}><td>{l.id}</td><td>{l.name || l.label || '—'}</td><td>{String(l.widthPx || '')}×{String(l.heightPx || '')}</td></tr>
            ))}
          </tbody>
        </table>
        {!layouts.length ? <p className="muted">No layout rows yet — canvas still works against plot polygons.</p> : null}
      </div>
      <div className="card">
        <h2>Plot polygons</h2>
        <table>
          <thead><tr><th>#</th><th>Status</th><th>Polygon</th><th></th></tr></thead>
          <tbody>
            {plots.map((p) => (
              <tr key={p.id} style={p.id === selectedId ? { background: '#eff6ff' } : undefined}>
                <td>{p.number || p.plotNumber}</td>
                <td><span className="chip">{p.status}</span></td>
                <td>{p.polygonJson ? 'mapped' : '—'}</td>
                <td><button className="btn ghost" type="button" onClick={() => setSelectedId(p.id)}>Select</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DangerZone() {
  return (
    <div>
      <div className="topbar"><h1>Founder danger zone</h1></div>
      <div className="card danger-zone">
        <h2>Destructive controls</h2>
        <p className="muted">
          Founder-only API gates. No mock localStorage side effects. Buttons stay disabled until runbook sign-off.
        </p>
        <button className="btn danger" disabled>Export org data</button>{' '}
        <button className="btn danger" disabled>Purge demo data</button>
      </div>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Shell><DashboardPage /></Shell>} />
      <Route path="/projects" element={<Shell><ProjectsPage /></Shell>} />
      <Route path="/projects/:projectId" element={<Shell><ProjectWorkspacePage /></Shell>} />
      <Route path="/projects/:projectId/plots" element={<Shell><PlotsPage /></Shell>} />
      <Route path="/plots" element={<Shell><PlotsPage /></Shell>} />
      <Route path="/layouts" element={<Shell><LayoutsPage /></Shell>} />
      <Route path="/customers" element={<Shell><CustomersPage /></Shell>} />
      <Route path="/customers/onboarding" element={<Shell><CustomerOnboardingPage /></Shell>} />
      <Route path="/conversion" element={<Shell><LeadConversionPage /></Shell>} />
      <Route path="/customers/:customerId" element={<Shell><CustomerDetail /></Shell>} />
      <Route path="/leads" element={<Shell><ResourceTable title="Leads" loader={() => api.leads.list() as Promise<AnyRow[]>} columns={[{ key: 'name', label: 'Name' }, { key: 'stage', label: 'Stage' }, { key: 'phone', label: 'Phone' }]} /></Shell>} />
      <Route path="/visits" element={<Shell><ResourceTable title="Site visits" loader={() => api.visits.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'status', label: 'Status' }, { key: 'scheduledAt', label: 'When' }]} /></Shell>} />
      <Route path="/reservations" element={<Shell><ResourceTable title="Reservations" loader={() => (api as any).reservations.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'state', label: 'State' }, { key: 'plotId', label: 'Plot' }, { key: 'customerId', label: 'Customer' }, { key: 'expiresAt', label: 'Expires' }]} /></Shell>} />
      <Route path="/bookings" element={<Shell><ResourceTable title="Bookings" loader={() => (api as any).bookings.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'state', label: 'State' }, { key: 'plotId', label: 'Plot' }, { key: 'customerId', label: 'Customer' }, { key: 'agentId', label: 'Agent' }, { key: 'agreementValuePaise', label: 'Agreement' }]} /></Shell>} />
      <Route path="/payments" element={<Shell><ResourceTable title="Payments" loader={() => api.payments.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'amountPaise', label: 'Amount' }, { key: 'method', label: 'Method' }, { key: 'status', label: 'Status' }]} /></Shell>} />
      <Route path="/receipts" element={<Shell><ReceiptsListPage /></Shell>} />
      <Route path="/receipts/:receiptId" element={<Shell><ReceiptDetailPage /></Shell>} />
      <Route path="/commissions" element={<Shell><ResourceTable title="Commissions" loader={() => (api as any).commissions.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'amountPaise', label: 'Amount' }, { key: 'status', label: 'Status' }, { key: 'bookingId', label: 'Booking' }]} /></Shell>} />
      <Route path="/collections" element={<Shell><ResourceTable title="Payment schedules / collections" loader={() => (api as any).paymentSchedules.list() as Promise<AnyRow[]>} columns={[{ key: 'name', label: 'Installment' }, { key: 'dueDate', label: 'Due' }, { key: 'amountDuePaise', label: 'Amount' }, { key: 'status', label: 'Status' }, { key: 'bookingId', label: 'Booking' }]} /></Shell>} />
      <Route path="/documents" element={<Shell><DocumentsPage /></Shell>} />
      <Route path="/registrations" element={<Shell><ResourceTable title="Registrations" loader={() => (api as any).registrations.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'status', label: 'Status' }, { key: 'deedNumber', label: 'Deed #' }, { key: 'registeredAt', label: 'Registered' }]} /></Shell>} />
      <Route path="/resale" element={<Shell><ResourceTable title="Resale listings" loader={() => (api as any).resales.list() as Promise<AnyRow[]>} columns={[{ key: 'id', label: 'Id' }, { key: 'status', label: 'Status' }, { key: 'askingPricePaise', label: 'Ask' }, { key: 'plotId', label: 'Plot' }, { key: 'customerId', label: 'Customer' }]} /></Shell>} />
      <Route path="/agents" element={<Shell><ResourceTable title="Agents" loader={() => (api as any).agents.list() as Promise<AnyRow[]>} columns={[{ key: 'code', label: 'Code' }, { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'region', label: 'Region' }, { key: 'status', label: 'Status' }]} /></Shell>} />
      <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
      <Route path="/reports/sales" element={<Shell><ReportsPage focus="sales" /></Shell>} />
      <Route path="/reports/inventory" element={<Shell><ReportsPage focus="inventory" /></Shell>} />
      <Route path="/reports/collections" element={<Shell><ReportsPage focus="collections" /></Shell>} />
      <Route path="/settings/company" element={<Shell><CompanySettingsPage /></Shell>} />
      <Route path="/settings/users" element={<Shell><ResourceTable title="Members / roles" loader={() => (api as any).users.list() as Promise<AnyRow[]>} columns={[{ key: 'displayName', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'roleCode', label: 'Role' }, { key: 'status', label: 'Status' }, { key: 'lastLoginAt', label: 'Last login' }]} /></Shell>} />
      <Route path="/settings/audit" element={<Shell><AuditPage /></Shell>} />
      <Route path="/settings/billing" element={<Shell><Placeholder title="Billing" note="Billing UI may be blocked by external credential." /></Shell>} />
      <Route path="/settings/danger" element={<Shell><DangerZone /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
