import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { acceptSession, api, tokens } from './api';

type Row = Record<string, any>;
type AuthBootState = 'AUTH_INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

function useRows(loader: () => Promise<Row[]>, deps: unknown[] = []) {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    loader().then(setRows).catch((e) => { setRows([]); setErr(String((e as Error).message || e)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { rows, err };
}

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const s = await api.auth.login(email, password);
      await acceptSession(s);
      nav('/');
    } catch (ex: any) {
      setErr(ex.message || 'Login failed');
    }
  }
  return (
    <div className="card login">
      <h1>Agent portal</h1>
      <p className="muted">Live API — sign in with your agent credentials.</p>
      <form onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="agent-email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="agent-password" />
        {err ? <p className="err">{err}</p> : null}
        <button className="btn" data-testid="agent-login">Sign in</button>
      </form>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [boot, setBoot] = useState<AuthBootState>('AUTH_INITIALIZING');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const access = await tokens.getAccessToken();
        if (access) {
          if (!cancelled) setBoot('AUTHENTICATED');
          return;
        }
        // Empty in-memory access after refresh/new tab — restore via HTTP-only cookie.
        const restored = await api.auth.restoreSession();
        if (!cancelled) setBoot(restored ? 'AUTHENTICATED' : 'UNAUTHENTICATED');
      } catch {
        if (!cancelled) setBoot('UNAUTHENTICATED');
      }
    })();
    return () => { cancelled = true; };
  }, []);
  if (boot === 'AUTH_INITIALIZING') {
    return <div className="card login" data-testid="auth-initializing">Restoring session…</div>;
  }
  if (boot === 'UNAUTHENTICATED') return <Navigate to="/login" replace />;
  return (
    <div className="shell">
      <aside className="nav">
        <strong>Bhairava Agent</strong>
        <Link to="/">Home</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/leads">Leads</Link>
        <Link to="/leads/new">New lead</Link>
        <Link to="/customers">Customers</Link>
        <Link to="/customers/onboarding">Onboard customer</Link>
        <Link to="/visits">Site visits</Link>
        <Link to="/visits/new">Schedule visit</Link>
        <Link to="/reservations">Reservations</Link>
        <Link to="/bookings">Bookings</Link>
        <Link to="/collections">Collections</Link>
        <Link to="/commissions">Commissions</Link>
        <Link to="/documents">Documents</Link>
        <Link to="/notifications">Notifications</Link>
        <Link to="/profile">Profile</Link>
        <button className="btn secondary" onClick={async () => { try { await api.auth.logout(); } catch {} await tokens.clear(); location.href = '/login'; }}>Sign out</button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Table({
  title,
  rows,
  cols,
  err,
}: {
  title: string;
  rows: Row[];
  cols: Array<{ key: string; label: string; render?: (r: Row) => string }>;
  err?: string;
}) {
  return (
    <div>
      <h1>{title}</h1>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i}>
                {cols.map((c) => (
                  <td key={c.key}>{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !err ? <p className="muted">No rows (scoped to this agent).</p> : null}
      </div>
    </div>
  );
}

function Home() {
  const leads = useRows(() => api.leads.list() as any);
  const visits = useRows(() => api.visits.list() as any);
  const bookings = useRows(() => (api as any).bookings.list() as any);
  const notifs = useRows(() => (api as any).notifications.list({ take: 20 }) as any);
  return (
    <div>
      <h1>Home</h1>
      <div className="grid">
        <div className="card" data-testid="stat-leads"><h3>My leads</h3><p>{leads.rows.length}</p></div>
        <div className="card" data-testid="stat-visits"><h3>Site visits</h3><p>{visits.rows.length}</p></div>
        <div className="card"><h3>Bookings</h3><p>{bookings.rows.length}</p></div>
        <div className="card"><h3>Unread-ish notifications</h3><p>{notifs.rows.filter((n) => !n.readAt).length}</p></div>
      </div>
    </div>
  );
}

function ProjectsPage() {
  const { rows, err } = useRows(() => api.projects.list() as any);
  return (
    <div>
      <Table title="Projects" rows={rows} cols={[{ key: 'name', label: 'Name' }, { key: 'city', label: 'City' }, { key: 'lifecycleStatus', label: 'Status' }]} err={err} />
      <div className="card">
        <p className="muted">Open a project for plot availability.</p>
        <ul>{rows.map((p) => <li key={p.id}><Link to={`/projects/${p.id}`}>{p.name}</Link></li>)}</ul>
      </div>
    </div>
  );
}

function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState<Row | null>(null);
  const [plots, setPlots] = useState<Row[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!projectId) return;
    (api.projects as any).get(projectId).then(setProject).catch((e: any) => setErr(String(e.message || e)));
    api.plots.listByProject(projectId).then(setPlots).catch((e: any) => setErr(String(e.message || e)));
  }, [projectId]);
  async function reserve(plotId: string) {
    try {
      await api.reservations.create({ plotId, customerId });
      setMsg('Reserved');
      setPlots(await api.plots.listByProject(projectId!));
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  async function book(plotId: string) {
    try {
      await api.bookings.create({ plotId, customerId, agreementValuePaise: '200000000', advancePaise: '1000000' } as any);
      setMsg('Booked');
      setPlots(await api.plots.listByProject(projectId!));
    } catch (e: any) { setErr(e.message || String(e)); }
  }
  return (
    <div>
      <h1>{project?.name || 'Project'}</h1>
      <p className="muted">{project?.city} · {project?.lifecycleStatus}</p>
      <div className="card row">
        <div><label>Customer id</label><input value={customerId} onChange={(e) => setCustomerId(e.target.value)} /></div>
      </div>
      {msg ? <p className="ok">{msg}</p> : null}
      {err ? <p className="err">{err}</p> : null}
      <div className="card">
        <table>
          <thead><tr><th>#</th><th>Status</th><th>Area</th><th /></tr></thead>
          <tbody>
            {plots.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/plots/${p.id}`}>{p.number || p.plotNumber}</Link></td>
                <td>{p.status}</td>
                <td>{String(p.areaSqYd ?? '—')}</td>
                <td><button className="btn secondary" disabled={!customerId || (p.status !== 'AVAILABLE' && p.status !== 'RESERVED')} onClick={() => void reserve(p.id)}>Reserve</button>{' '}<button className="btn" disabled={!customerId} onClick={() => void book(p.id)}>Book</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerOnboard() {
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', phone: '', email: '', city: '', address: '', notes: '', pan: '', aadhaar: '' });
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      const c = await api.customers.create({
        name: form.name, phone: form.phone, email: form.email || undefined, city: form.city || undefined,
        address: form.address || undefined, notes: form.notes || undefined,
        ...(form.pan ? { pan: form.pan } : {}), ...(form.aadhaar ? { aadhaar: form.aadhaar } : {}),
      } as any);
      nav('/customers');
      void c;
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }
  return (
    <div>
      <h1>Customer onboarding</h1>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Phone</label><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label>City</label><input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div style={{ flex: '1 1 100%' }}><label>Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><label>PAN</label><input value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></div>
          <div><label>Aadhaar</label><input value={form.aadhaar} onChange={(e) => setForm({ ...form, aadhaar: e.target.value })} /></div>
          <div style={{ flex: '1 1 100%' }}><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        {err ? <p className="err">{err}</p> : null}
        <button className="btn" type="submit">Save customer</button>
      </form>
    </div>
  );
}

function NotificationsPage() {
  const { rows, err } = useRows(() => (api as any).notifications.list() as any);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Notifications</h1>
        <button className="btn secondary" onClick={() => void (api as any).notifications.markAllRead().then(() => location.reload())}>Mark all read</button>
      </div>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        {rows.map((n) => (
          <div key={n.id} style={{ padding: '.6rem 0', borderBottom: '1px solid #e2e8f0' }}>
            <strong>{n.title}</strong>
            <div className="muted">{n.body}</div>
            {!n.readAt ? <button className="btn ghost" onClick={() => void (api as any).notifications.markRead(n.id).then(() => location.reload())}>Mark read</button> : <span className="muted">Read</span>}
          </div>
        ))}
      </div>
    </div>
  );
}



function CreateLeadPage() {
  const nav = useNavigate();
  const projects = useRows(() => api.projects.list() as any);
  const [form, setForm] = useState({ name: '', phone: '', email: '', projectId: '', notes: '' });
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.leads.create({ name: form.name, phone: form.phone, email: form.email || undefined, projectId: form.projectId || undefined, notes: form.notes || undefined } as any);
      nav('/leads');
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }
  return (
    <div>
      <h1>New lead</h1>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <div><label>Name</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label>Phone</label><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label>Email</label><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label>Project</label>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">—</option>
              {projects.rows.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 100%' }}><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        {err ? <p className="err">{err}</p> : null}
        <button className="btn" type="submit">Create lead</button>
      </form>
    </div>
  );
}

function CreateVisitPage() {
  const nav = useNavigate();
  const projects = useRows(() => api.projects.list() as any);
  const customers = useRows(() => api.customers.list() as any);
  const [form, setForm] = useState({ projectId: '', customerId: '', scheduledAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16), notes: '' });
  const [err, setErr] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.visits.create({ projectId: form.projectId, customerId: form.customerId || undefined, scheduledAt: new Date(form.scheduledAt).toISOString(), notes: form.notes || undefined } as any);
      nav('/visits');
    } catch (ex: any) { setErr(ex.message || String(ex)); }
  }
  return (
    <div>
      <h1>Schedule site visit</h1>
      <form className="card" onSubmit={submit}>
        <div className="row">
          <div><label>Project</label>
            <select required value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">Select…</option>
              {projects.rows.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
          </div>
          <div><label>Customer</label>
            <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">—</option>
              {customers.rows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label>When</label><input type="datetime-local" required value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></div>
          <div style={{ flex: '1 1 100%' }}><label>Notes</label><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        {err ? <p className="err">{err}</p> : null}
        <button className="btn" type="submit">Schedule</button>
      </form>
    </div>
  );
}

function LeadsPage() { const { rows, err } = useRows(() => api.leads.list() as any); return <Table title="My leads" rows={rows} cols={[{ key: 'name', label: 'Name' }, { key: 'stage', label: 'Stage' }, { key: 'phone', label: 'Phone' }]} err={err} />; }
function VisitsPage() { const { rows, err } = useRows(() => api.visits.list() as any); return <Table title="Site visits" rows={rows} cols={[{ key: 'id', label: 'Id' }, { key: 'status', label: 'Status' }, { key: 'scheduledAt', label: 'When' }]} err={err} />; }
function CustomersPage() { const { rows, err } = useRows(() => api.customers.list() as any); return <Table title="Customers" rows={rows} cols={[{ key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'city', label: 'City' }]} err={err} />; }
function ReservationsPage() { const { rows, err } = useRows(() => (api as any).reservations.list() as any); return <Table title="Reservations" rows={rows} cols={[{ key: 'id', label: 'Id' }, { key: 'state', label: 'State' }, { key: 'plotId', label: 'Plot' }, { key: 'expiresAt', label: 'Expires' }]} err={err} />; }
function BookingsPage() {
  const { rows, err } = useRows(() => (api as any).bookings.list() as any);
  return (
    <Table
      title="Bookings"
      rows={rows}
      cols={[
        { key: 'id', label: 'Id' },
        { key: 'state', label: 'State' },
        { key: 'plotId', label: 'Plot' },
        {
          key: 'customer',
          label: 'Customer',
          render: (r) =>
            r.customer?.redacted
              ? '—'
              : String(r.customer?.name || r.customerId || '—'),
        },
        {
          key: 'responsibleAgent',
          label: 'Agent',
          render: (r) =>
            String(r.responsibleAgent?.code || r.agent?.code || r.agentId || '—'),
        },
        { key: 'agreementValuePaise', label: 'Agreement (paise)' },
      ]}
      err={err}
    />
  );
}
function CollectionsPage() { const { rows, err } = useRows(() => (api as any).paymentSchedules.list() as any); return <Table title="Collections / schedules" rows={rows} cols={[{ key: 'name', label: 'Installment' }, { key: 'dueDate', label: 'Due' }, { key: 'amountDuePaise', label: 'Amount' }, { key: 'status', label: 'Status' }]} err={err} />; }
function CommissionsPage() { const { rows, err } = useRows(() => (api as any).commissions.list() as any); return <Table title="Commissions" rows={rows} cols={[{ key: 'amountPaise', label: 'Amount' }, { key: 'status', label: 'Status' }, { key: 'bookingId', label: 'Booking' }]} err={err} />; }
function DocumentsPage() { const { rows, err } = useRows(() => api.documents.list() as any); return <Table title="Documents" rows={rows} cols={[{ key: 'title', label: 'Title' }, { key: 'visibility', label: 'Visibility' }, { key: 'version', label: 'Version' }]} err={err} />; }

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/projects" element={<Shell><ProjectsPage /></Shell>} />
      <Route path="/projects/:projectId" element={<Shell><ProjectDetail /></Shell>} />
      <Route path="/plots/:plotId" element={<Shell><div className="card"><h1>Plot</h1><p className="muted">Detail via project inventory — live API status.</p><Link to="/projects">Back</Link></div></Shell>} />
      <Route path="/leads" element={<Shell><LeadsPage /></Shell>} />
      <Route path="/leads/new" element={<Shell><CreateLeadPage /></Shell>} />
      <Route path="/visits" element={<Shell><VisitsPage /></Shell>} />
      <Route path="/visits/new" element={<Shell><CreateVisitPage /></Shell>} />
      <Route path="/customers" element={<Shell><CustomersPage /></Shell>} />
      <Route path="/customers/onboarding" element={<Shell><CustomerOnboard /></Shell>} />
      <Route path="/reservations" element={<Shell><ReservationsPage /></Shell>} />
      <Route path="/bookings" element={<Shell><BookingsPage /></Shell>} />
      <Route path="/collections" element={<Shell><CollectionsPage /></Shell>} />
      <Route path="/commissions" element={<Shell><CommissionsPage /></Shell>} />
      <Route path="/documents" element={<Shell><DocumentsPage /></Shell>} />
      <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
      <Route path="/profile" element={<Shell><div className="card"><h1>Profile</h1><p className="muted">Agent identity from JWT session; business data via live API ownership filters.</p></div></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
