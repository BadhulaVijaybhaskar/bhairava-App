import { FormEvent, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { acceptSession, api, tokens } from './api';

type Row = Record<string, any>;
type AuthBootState = 'AUTH_INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED';

function useRows(loader: () => Promise<Row[]>) {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState('');
  useEffect(() => {
    loader().then(setRows).catch((e) => { setRows([]); setErr(String((e as Error).message || e)); });
  }, []);
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
      <h1>Customer portal</h1>
      <p className="muted">Sign in with your customer credentials.</p>
      <form onSubmit={onSubmit}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err ? <p className="err">{err}</p> : null}
        <button className="btn">Sign in</button>
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
        <strong>My Bhairava</strong>
        <Link to="/">Home</Link>
        <Link to="/explore">Explore projects</Link>
        <Link to="/property">My properties</Link>
        <Link to="/bookings">My bookings</Link>
        <Link to="/payments">Payments</Link>
        <Link to="/schedules">Payment schedule</Link>
        <Link to="/receipts">Receipts</Link>
        <Link to="/documents">My documents</Link>
        <Link to="/notifications">Notifications</Link>
        <Link to="/support">Support</Link>
        <Link to="/profile">Profile</Link>
        <button className="btn secondary" onClick={async () => { try { await api.auth.logout(); } catch {} await tokens.clear(); location.href = '/login'; }}>Sign out</button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Table({ title, rows, cols, err }: { title: string; rows: Row[]; cols: Array<{ key: string; label: string }>; err?: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <div className="card">
        {err ? <p className="err">{err}</p> : null}
        <table>
          <thead><tr>{cols.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id || i}>{cols.map((c) => <td key={c.key}>{String(r[c.key] ?? '—')}</td>)}</tr>
            ))}
          </tbody>
        </table>
        {!rows.length && !err ? <p className="muted">No rows for this customer.</p> : null}
      </div>
    </div>
  );
}

function Home() {
  const bookings = useRows(() => (api as any).bookings.list() as any);
  const payments = useRows(() => api.payments.list() as any);
  const notifs = useRows(() => (api as any).notifications.list() as any);
  return (
    <div>
      <h1>Home</h1>
      <div className="grid">
        <div className="card"><h3>My bookings</h3><p>{bookings.rows.length}</p></div>
        <div className="card"><h3>Payments</h3><p>{payments.rows.length}</p></div>
        <div className="card"><h3>Notifications</h3><p>{notifs.rows.filter((n) => !n.readAt).length} unread</p></div>
      </div>
    </div>
  );
}

function ExplorePage() {
  const { rows, err } = useRows(() => api.projects.list() as any);
  return (
    <div>
      <Table title="Explore projects" rows={rows} cols={[{ key: 'name', label: 'Project' }, { key: 'city', label: 'City' }, { key: 'lifecycleStatus', label: 'Status' }]} err={err} />
      <div className="card">
        <ul>{rows.map((p) => <li key={p.id}><Link to={`/explore/${p.id}`}>{p.name} — plot availability</Link></li>)}</ul>
      </div>
    </div>
  );
}

function ExploreDetail() {
  const id = location.pathname.split('/').pop()!;
  const [plots, setPlots] = useState<Row[]>([]);
  const [project, setProject] = useState<Row | null>(null);
  useEffect(() => {
    (api.projects as any).get(id).then(setProject).catch(() => setProject(null));
    api.plots.listByProject(id).then(setPlots).catch(() => setPlots([]));
  }, [id]);
  return (
    <div>
      <h1>{project?.name || 'Project'}</h1>
      <p className="muted">{project?.description || project?.city}</p>
      <div className="card">
        <table>
          <thead><tr><th>Plot</th><th>Status</th><th>Area</th></tr></thead>
          <tbody>{plots.map((p) => <tr key={p.id}><td>{p.number}</td><td>{p.status}</td><td>{String(p.areaSqYd ?? '—')}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function ReceiptsPage() {
  const { rows, err } = useRows(() => (api as any).receipts.list() as any);
  return (
    <div>
      <Table title="Receipts" rows={rows} cols={[{ key: 'receiptNumber', label: 'Receipt #' }, { key: 'issuedAt', label: 'Issued' }, { key: 'bookingId', label: 'Booking' }]} err={err} />
      <div className="card"><p className="muted">Open a receipt in Admin for A4 print; customer list is ownership-scoped via API.</p>
        <ul>{rows.map((r) => <li key={r.id}><Link to={`/receipts/${r.id}`}>{r.receiptNumber}</Link></li>)}</ul>
      </div>
    </div>
  );
}

function ReceiptDetail() {
  const id = location.pathname.split('/').pop()!;
  const [row, setRow] = useState<Row | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    (api as any).receipts.get(id).then(setRow).catch((e: any) => setErr(String(e.message || e)));
  }, [id]);
  if (err) return <p className="err">{err}</p>;
  if (!row) return <p className="muted">Loading…</p>;
  return (
    <div className="card receipt-sheet">
      <h1>Receipt {row.receiptNumber}</h1>
      <p>{row.customer?.name} · {row.project?.name} · Plot {row.plot?.number}</p>
      <p>Amount: {String(row.payment?.amountPaise)} paise · {row.payment?.method}</p>
      <button className="btn" onClick={() => window.print()}>Print</button>
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
            {!n.readAt ? <button className="btn ghost" onClick={() => void (api as any).notifications.markRead(n.id).then(() => location.reload())}>Mark read</button> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PropertyPage() { const { rows, err } = useRows(() => (api as any).bookings.list() as any); return <Table title="My properties / bookings" rows={rows} cols={[{ key: 'id', label: 'Booking' }, { key: 'plotId', label: 'Plot' }, { key: 'state', label: 'State' }, { key: 'agreementValuePaise', label: 'Agreement' }]} err={err} />; }
function BookingsPage() { const { rows, err } = useRows(() => (api as any).bookings.list() as any); return <Table title="My bookings" rows={rows} cols={[{ key: 'id', label: 'Id' }, { key: 'state', label: 'State' }, { key: 'plotId', label: 'Plot' }]} err={err} />; }
function PaymentsPage() { const { rows, err } = useRows(() => api.payments.list() as any); return <Table title="Payments" rows={rows} cols={[{ key: 'id', label: 'Id' }, { key: 'amountPaise', label: 'Amount' }, { key: 'method', label: 'Method' }, { key: 'paidAt', label: 'Paid' }]} err={err} />; }
function SchedulesPage() { const { rows, err } = useRows(() => (api as any).paymentSchedules.list() as any); return <Table title="Payment schedule" rows={rows} cols={[{ key: 'name', label: 'Installment' }, { key: 'dueDate', label: 'Due' }, { key: 'amountDuePaise', label: 'Amount' }, { key: 'status', label: 'Status' }]} err={err} />; }
function DocumentsPage() { const { rows, err } = useRows(() => api.documents.list() as any); return <Table title="My documents" rows={rows} cols={[{ key: 'title', label: 'Title' }, { key: 'visibility', label: 'Visibility' }, { key: 'version', label: 'Version' }]} err={err} />; }

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/explore" element={<Shell><ExplorePage /></Shell>} />
      <Route path="/explore/:projectId" element={<Shell><ExploreDetail /></Shell>} />
      <Route path="/property" element={<Shell><PropertyPage /></Shell>} />
      <Route path="/bookings" element={<Shell><BookingsPage /></Shell>} />
      <Route path="/payments" element={<Shell><PaymentsPage /></Shell>} />
      <Route path="/schedules" element={<Shell><SchedulesPage /></Shell>} />
      <Route path="/receipts" element={<Shell><ReceiptsPage /></Shell>} />
      <Route path="/receipts/:receiptId" element={<Shell><ReceiptDetail /></Shell>} />
      <Route path="/documents" element={<Shell><DocumentsPage /></Shell>} />
      <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
      <Route path="/support" element={<Shell><div className="card"><h1>Support</h1><p className="muted">In-app support channel. Contact your assigned agent or administrator. External ticketing providers remain optional.</p></div></Shell>} />
      <Route path="/profile" element={<Shell><div className="card"><h1>Profile</h1><p className="muted">Customer sees own masked profile via API; cross-customer IDs are denied.</p></div></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
