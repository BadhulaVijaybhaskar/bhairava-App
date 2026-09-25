import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { AGENT_DEMOS, PLATFORM_SEED, findAgentDemo } from "@/lib/seed";
import {
  agentDocuments,
  agentNotifications,
  bookingsForAgent,
  commissionsForAgent,
  customersForAgent,
  leadsForAgent,
  projectPlotForAgent,
  reservationsForAgent,
  visitsForAgent,
} from "@/lib/projections";

const SESSION_KEY = "bhairava.agent.session.v1";
type Session = { email: string; name: string; agentId: string };

function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState<string>(AGENT_DEMOS[0].email);
  const [password, setPassword] = useState<string>(AGENT_DEMOS[0].password);
  const [err, setErr] = useState("");
  return (
    <div className="login card">
      <h1>Agent sign-in</h1>
      <p className="muted">Demo: agent1@bhairava.com / agent1@2026 Â· agent2@bhairava.com / agent2@2026</p>
      <label className="muted">Quick pick</label>
      <select
        data-testid="agent-demo-pick"
        value={email}
        onChange={(e) => {
          const a = AGENT_DEMOS.find((x) => x.email === e.target.value);
          if (a) {
            setEmail(a.email);
            setPassword(a.password);
          }
        }}
      >
        {AGENT_DEMOS.map((a) => (
          <option key={a.id} value={a.email}>
            {a.name} ({a.email})
          </option>
        ))}
      </select>
      <label className="muted">Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="agent-email" />
      <label className="muted">Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="agent-password" />
      {err ? <p className="chip danger">{err}</p> : null}
      <button
        className="btn"
        data-testid="agent-login"
        onClick={() => {
          const match = findAgentDemo(email, password);
          if (match) {
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ email: match.email, name: match.name, agentId: match.id }),
            );
            nav("/");
          } else setErr("Invalid credentials");
        }}
      >
        Sign in
      </button>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  const links: Array<[string, string]> = [
    ["/", "Home"],
    ["/projects", "Projects"],
    ["/plots", "Plot availability"],
    ["/leads", "My leads"],
    ["/customers", "My customers"],
    ["/onboarding", "Customer onboarding"],
    ["/visits", "Site visits"],
    ["/reservations", "Reservations"],
    ["/bookings", "Bookings"],
    ["/collections", "Collections"],
    ["/commissions", "Commissions"],
    ["/documents", "Documents"],
    ["/notifications", "Notifications"],
    ["/profile", "Profile"],
  ];
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">Bhairava Agent</div>
        <p className="muted" style={{ color: "#94a3b8" }} data-testid="agent-session-name">
          {session.name}
        </p>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>
            {label}
          </NavLink>
        ))}
        <button
          className="btn ghost"
          style={{ marginTop: "1rem", width: "100%" }}
          data-testid="agent-signout"
          onClick={() => {
            localStorage.removeItem(SESSION_KEY);
            location.href = "/login";
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function Home() {
  const session = getSession()!;
  const mine = customersForAgent(PLATFORM_SEED, session.agentId);
  const bookings = bookingsForAgent(PLATFORM_SEED, session.agentId);
  const leads = leadsForAgent(PLATFORM_SEED, session.agentId);
  return (
    <div>
      <h1>Sell workspace</h1>
      <p className="muted">Assigned customers and inventory. Other agents&apos; PII stays redacted.</p>
      <div className="grid cols-2">
        <div className="card" data-testid="stat-customers"><h3>My customers</h3><p>{mine.length}</p></div>
        <div className="card" data-testid="stat-bookings"><h3>My bookings</h3><p>{bookings.length}</p></div>
        <div className="card" data-testid="stat-leads"><h3>My leads</h3><p>{leads.length}</p></div>
        <div className="card" data-testid="stat-commissions"><h3>Commissions</h3><p>{commissionsForAgent(PLATFORM_SEED, session.agentId).length}</p></div>
      </div>
    </div>
  );
}

function Projects() {
  return (
    <div>
      <h1>Projects</h1>
      <div className="grid cols-2">
        {PLATFORM_SEED.projects.filter((p) => p.agentVisible).map((p) => (
          <NavLink className="card" key={p.id} to={`/projects/${p.id}`} data-testid={`agent-project-${p.id}`}>
            <h3>{p.name}</h3>
            <p className="muted">{p.code} Â· {p.city}</p>
            <span className="chip">Read-only</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

function ProjectDetail() {
  const { projectId } = useParams();
  const project = PLATFORM_SEED.projects.find((p) => p.id === projectId);
  if (!project) return <div className="card"><p>Project not found</p><NavLink to="/projects">Back</NavLink></div>;
  const plots = PLATFORM_SEED.plots.filter((p) => p.projectId === project.id);
  return (
    <div>
      <NavLink to="/projects" className="muted">â† Projects</NavLink>
      <h1>{project.name}</h1>
      <p className="muted">{project.code} Â· {project.city} Â· master data read-only</p>
      <div className="card">
        <p>{plots.length} plots in inventory</p>
        <NavLink className="btn" to="/plots">Open plot availability</NavLink>
      </div>
    </div>
  );
}

function Plots() {
  const session = getSession()!;
  const rows = PLATFORM_SEED.plots.map((p) => projectPlotForAgent(p, PLATFORM_SEED, session.agentId));
  return (
    <div>
      <h1>Plot availability</h1>
      <p className="muted">Canonical statuses. Customer PII only when assigned to you.</p>
      <div className="card">
        <table data-testid="agent-plots-table">
          <thead>
            <tr><th>Plot</th><th>Status</th><th>Area</th><th>Price</th><th>Customer</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td>
                <td><span className="chip">{r.status}</span></td>
                <td>{r.area}</td>
                <td>â‚¹{r.price.toLocaleString("en-IN")}</td>
                <td data-testid={`plot-customer-${r.id}`}>{r.customer ? r.customer.name : r.redacted ? <span className="chip warn">PII hidden</span> : "â€”"}</td>
                <td><NavLink to={`/plots/${r.id}`}>Detail</NavLink></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlotDetail() {
  const { plotId } = useParams();
  const session = getSession()!;
  const plot = PLATFORM_SEED.plots.find((p) => p.id === plotId);
  if (!plot) return <div className="card"><p>Not found</p><NavLink to="/plots">Back</NavLink></div>;
  const row = projectPlotForAgent(plot, PLATFORM_SEED, session.agentId);
  return (
    <div>
      <NavLink to="/plots" className="muted">â† Plot availability</NavLink>
      <h1>Plot {row.number}</h1>
      <div className="card" data-testid="agent-plot-detail">
        <p><span className="chip">{row.status}</span></p>
        <p>{row.area} sq yd Â· {row.facing} Â· â‚¹{row.price.toLocaleString("en-IN")}</p>
        <p>Customer: {row.customer ? `${row.customer.name} Â· ${row.customer.phone}` : row.redacted ? "PII hidden (other agent)" : "â€”"}</p>
        <p className="muted">Inventory is read-only for agents.</p>
      </div>
    </div>
  );
}

function SimpleTable({ title, rows, testId }: { title: string; rows: Array<{ id: string; name: string; meta: string }>; testId?: string }) {
  return (
    <div>
      <h1>{title}</h1>
      <div className="card">
        <table data-testid={testId}>
          <thead><tr><th>Name</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-testid={`row-${r.id}`}><td>{r.name}</td><td className="muted">{r.meta}</td></tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={2} className="muted">None assigned</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Documents() {
  const session = getSession()!;
  const docs = agentDocuments(PLATFORM_SEED, session.agentId);
  return (
    <div>
      <h1>Documents</h1>
      <p className="muted">Agent-visible only â€” INTERNAL vault excluded.</p>
      <div className="card" data-testid="agent-docs">
        <ul>
          {docs.map((d) => (
            <li key={d.id}>{d.title} <span className="chip">{d.visibility}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}


function LeadsPage() {
  const s = getSession()!;
  return <SimpleTable title="My leads" testId="agent-leads" rows={leadsForAgent(PLATFORM_SEED, s.agentId).map((l) => ({ id: l.id, name: l.name, meta: `${l.stage} · ${l.phone}` }))} />;
}
function CustomersPage() {
  const s = getSession()!;
  return <SimpleTable title="My customers" testId="agent-customers" rows={customersForAgent(PLATFORM_SEED, s.agentId).map((c) => ({ id: c.id, name: c.name, meta: c.phone }))} />;
}
function VisitsPage() {
  const s = getSession()!;
  return <SimpleTable title="Site visits" testId="agent-visits" rows={visitsForAgent(PLATFORM_SEED, s.agentId).map((v) => ({ id: v.id, name: v.id, meta: `${v.when} · ${v.status}` }))} />;
}
function ReservationsPage() {
  const s = getSession()!;
  return <SimpleTable title="Reservations" testId="agent-reservations" rows={reservationsForAgent(PLATFORM_SEED, s.agentId).map((r) => ({ id: r.id, name: r.id, meta: `${r.plotId} · ${r.status}` }))} />;
}
function BookingsPage() {
  const s = getSession()!;
  return <SimpleTable title="Bookings" testId="agent-bookings" rows={bookingsForAgent(PLATFORM_SEED, s.agentId).map((b) => ({ id: b.id, name: b.id, meta: `Rs ${b.amount.toLocaleString("en-IN")} · ${b.status}` }))} />;
}
function CommissionsPage() {
  const s = getSession()!;
  return <SimpleTable title="Commissions" testId="agent-commissions" rows={commissionsForAgent(PLATFORM_SEED, s.agentId).map((c) => ({ id: c.id, name: c.id, meta: `Rs ${c.amount.toLocaleString("en-IN")} · ${c.status}` }))} />;
}
function NotificationsPage() {
  const s = getSession()!;
  return <SimpleTable title="Notifications" testId="agent-notifications" rows={agentNotifications(PLATFORM_SEED, s.agentId).map((n) => ({ id: n.id, name: n.title, meta: n.body }))} />;
}
function ProfilePage() {
  const s = getSession()!;
  return <div className="card" data-testid="agent-profile"><h1>Profile</h1><p>{s.name}</p><p className="muted">{s.email}</p><p className="muted">Agent id: {s.agentId}</p></div>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><Home /></Shell>} />
      <Route path="/projects" element={<Shell><Projects /></Shell>} />
      <Route path="/projects/:projectId" element={<Shell><ProjectDetail /></Shell>} />
      <Route path="/plots" element={<Shell><Plots /></Shell>} />
      <Route path="/plots/:plotId" element={<Shell><PlotDetail /></Shell>} />
      <Route path="/leads" element={<Shell><LeadsPage /></Shell>} />
      <Route path="/customers" element={<Shell><CustomersPage /></Shell>} />
      <Route path="/onboarding" element={<Shell><div className="card"><h1>Customer onboarding</h1><p className="muted">Capture KYC for your assigned prospects (client-test stub).</p></div></Shell>} />
      <Route path="/visits" element={<Shell><VisitsPage /></Shell>} />
      <Route path="/reservations" element={<Shell><ReservationsPage /></Shell>} />
      <Route path="/bookings" element={<Shell><BookingsPage /></Shell>} />
      <Route path="/collections" element={<Shell><div className="card"><h1>Collections</h1><p className="muted">Own customers/bookings only.</p></div></Shell>} />
      <Route path="/commissions" element={<Shell><CommissionsPage /></Shell>} />
      <Route path="/documents" element={<Shell><Documents /></Shell>} />
      <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
      <Route path="/profile" element={<Shell><ProfilePage /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
