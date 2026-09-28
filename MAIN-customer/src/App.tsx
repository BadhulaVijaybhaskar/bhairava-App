import { NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useState, type ReactNode } from "react";
import { CUSTOMER_DEMOS, PLATFORM_SEED, findCustomerDemo } from "@/lib/seed";
import {
  bookingsForCustomer,
  customerDocuments,
  customerNotifications,
  paymentsForCustomer,
  projectPlotForCustomer,
  propertiesForCustomer,
} from "@/lib/projections";

const SESSION_KEY = "bhairava.customer.session.v1";
type Session = { email: string; name: string; customerId: string };

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
  const [email, setEmail] = useState<string>(CUSTOMER_DEMOS[0].email);
  const [password, setPassword] = useState<string>(CUSTOMER_DEMOS[0].password);
  const [err, setErr] = useState("");
  return (
    <div className="login card">
      <h1>Customer sign-in</h1>
      <p className="muted">Demo: customer1@bhairava.com / customer1@2026 Â· customer2@bhairava.com / customer2@2026</p>
      <label className="muted">Quick pick</label>
      <select
        data-testid="customer-demo-pick"
        value={email}
        onChange={(e) => {
          const c = CUSTOMER_DEMOS.find((x) => x.email === e.target.value);
          if (c) {
            setEmail(c.email);
            setPassword(c.password);
          }
        }}
      >
        {CUSTOMER_DEMOS.map((c) => (
          <option key={c.id} value={c.email}>
            {c.name} ({c.email})
          </option>
        ))}
      </select>
      <label className="muted">Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="customer-email" />
      <label className="muted">Password</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="customer-password" />
      {err ? <p className="chip danger">{err}</p> : null}
      <button
        className="btn"
        data-testid="customer-login"
        onClick={() => {
          const match = findCustomerDemo(email, password);
          if (match) {
            localStorage.setItem(
              SESSION_KEY,
              JSON.stringify({ email: match.email, name: match.name, customerId: match.id }),
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
    ["/explore/projects", "Explore projects"],
    ["/explore/plots", "Plot availability"],
    ["/account/properties", "My properties"],
    ["/account/bookings", "My bookings"],
    ["/account/payments", "Payments"],
    ["/account/schedule", "Payment schedule"],
    ["/account/receipts", "Receipts"],
    ["/account/documents", "My documents"],
    ["/account/notifications", "Notifications"],
    ["/account/support", "Support"],
    ["/account/profile", "Profile"],
  ];
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">Bhairava Customer</div>
        <p className="muted" style={{ color: "#94a3b8" }} data-testid="customer-session-name">{session.name}</p>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : undefined)}>
            {label}
          </NavLink>
        ))}
        <button
          className="btn ghost"
          style={{ marginTop: "1rem", width: "100%" }}
          data-testid="customer-signout"
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

function ExplorePlots() {
  const rows = PLATFORM_SEED.plots.map(projectPlotForCustomer);
  return (
    <div>
      <h1>Plot availability</h1>
      <p className="muted">Detail only for AVAILABLE / RESALE_AVAILABLE. Never shows who holds other plots.</p>
      <div className="card">
        <table data-testid="customer-plots-table">
          <thead>
            <tr><th>Plot</th><th>Status</th><th>Area</th><th>Price</th><th>Facing</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.number}</td>
                <td><span className="chip">{r.status}</span></td>
                <td>{r.detailVisible ? r.area : "â€”"}</td>
                <td>{r.detailVisible ? `â‚¹${(r.price ?? 0).toLocaleString("en-IN")}` : "â€”"}</td>
                <td>{r.detailVisible ? r.facing : "â€”"}</td>
                <td><NavLink to={`/explore/plots/${r.id}`}>Detail</NavLink></td>
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
  const plot = PLATFORM_SEED.plots.find((p) => p.id === plotId);
  if (!plot) return <div className="card"><p>Not found</p><NavLink to="/explore/plots">Back</NavLink></div>;
  const row = projectPlotForCustomer(plot);
  return (
    <div>
      <NavLink to="/explore/plots" className="muted">â† Plot availability</NavLink>
      <h1>Plot {row.number}</h1>
      <div className="card" data-testid="customer-plot-detail">
        <p><span className="chip">{row.status}</span></p>
        {row.detailVisible ? (
          <p>{row.area} sq yd Â· {row.facing} Â· â‚¹{(row.price ?? 0).toLocaleString("en-IN")}</p>
        ) : (
          <p className="muted">Public status only â€” buyer identity and pricing details are hidden for non-available plots.</p>
        )}
        <p className="muted" data-testid="no-other-buyer">No other-buyer PII is shown on this screen.</p>
      </div>
    </div>
  );
}

function ProjectDetail() {
  const { projectId } = useParams();
  const project = PLATFORM_SEED.projects.find((p) => p.id === projectId);
  if (!project) return <div className="card"><p>Not found</p><NavLink to="/explore/projects">Back</NavLink></div>;
  return (
    <div>
      <NavLink to="/explore/projects" className="muted">â† Projects</NavLink>
      <h1>{project.name}</h1>
      <p className="muted">{project.city} Â· public listing</p>
      <NavLink className="btn" to="/explore/plots">View plots</NavLink>
    </div>
  );
}

function MyDocuments() {
  const session = getSession()!;
  const docs = customerDocuments(PLATFORM_SEED, session.customerId);
  const vaultCount = PLATFORM_SEED.documents.filter((d) => d.visibility === "INTERNAL").length;
  return (
    <div>
      <h1>My documents</h1>
      <p className="muted">Never includes project document vault ({vaultCount} internal docs hidden).</p>
      <div className="card" data-testid="customer-docs">
        <ul>
          {docs.map((d) => (
            <li key={d.id}>{d.title}</li>
          ))}
          {docs.length === 0 ? <li className="muted">No documents</li> : null}
        </ul>
      </div>
    </div>
  );
}


function HomePage() {
  return <div><h1>Welcome</h1><p className="muted">Explore public inventory or manage your own bookings and documents.</p></div>;
}
function ProjectsPage() {
  return (
    <div>
      <h1>Projects</h1>
      <div className="grid cols-2">
        {PLATFORM_SEED.projects.filter((p) => p.customerListed).map((p) => (
          <NavLink className="card" key={p.id} to={`/explore/projects/${p.id}`} data-testid={`customer-project-${p.id}`}>
            <h3>{p.name}</h3>
            <p className="muted">{p.city}</p>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
function BookingsPage() {
  const session = getSession()!;
  const rows = bookingsForCustomer(PLATFORM_SEED, session.customerId);
  return (
    <div>
      <h1>My bookings</h1>
      <div className="card">
        <table data-testid="customer-bookings">
          <thead><tr><th>Booking</th><th>Plot</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{PLATFORM_SEED.plots.find((p) => p.id === b.plotId)?.number}</td>
                <td>Rs {b.amount.toLocaleString("en-IN")}</td>
                <td><span className="chip">{b.status}</span></td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={4} className="muted">No bookings</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function PropertiesPage() {
  const session = getSession()!;
  const rows = propertiesForCustomer(PLATFORM_SEED, session.customerId);
  return (
    <div>
      <h1>My properties</h1>
      <div className="card" data-testid="customer-properties">
        <ul>
          {rows.map((p) => (<li key={p.id}>{p.number} · <span className="chip">{p.status}</span></li>))}
          {rows.length === 0 ? <li className="muted">None yet</li> : null}
        </ul>
      </div>
    </div>
  );
}
function PaymentsPage() {
  const session = getSession()!;
  const rows = paymentsForCustomer(PLATFORM_SEED, session.customerId);
  return (
    <div>
      <h1>Payments</h1>
      <div className="card">
        <table data-testid="customer-payments">
          <thead><tr><th>Payment</th><th>Amount</th><th>Status</th><th>Due</th></tr></thead>
          <tbody>
            {rows.map((p) => (<tr key={p.id}><td>{p.id}</td><td>Rs {p.amount.toLocaleString("en-IN")}</td><td><span className="chip">{p.status}</span></td><td>{p.dueDate}</td></tr>))}
            {rows.length === 0 ? <tr><td colSpan={4} className="muted">No payments</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function SchedulePage() {
  const session = getSession()!;
  const rows = paymentsForCustomer(PLATFORM_SEED, session.customerId);
  return (
    <div className="card" data-testid="customer-schedule">
      <h1>Payment schedule</h1>
      <p className="muted">Own schedule only.</p>
      <ul>{rows.map((p) => <li key={p.id}>{p.dueDate}: Rs {p.amount.toLocaleString("en-IN")} ({p.status})</li>)}</ul>
    </div>
  );
}
function ReceiptsPage() {
  const session = getSession()!;
  const rows = paymentsForCustomer(PLATFORM_SEED, session.customerId).filter((p) => p.status === "Paid");
  return (
    <div className="card" data-testid="customer-receipts">
      <h1>Receipts</h1>
      <ul>
        {rows.map((p) => <li key={p.id}>Receipt {p.id} · Rs {p.amount.toLocaleString("en-IN")} · {p.paidAt}</li>)}
        {rows.length === 0 ? <li className="muted">No receipts</li> : null}
      </ul>
    </div>
  );
}
function NotificationsPage() {
  const session = getSession()!;
  return (
    <div className="card" data-testid="customer-notifications">
      <h1>Notifications</h1>
      <ul>{customerNotifications(PLATFORM_SEED, session.customerId).map((n) => <li key={n.id}><strong>{n.title}</strong> — {n.body}</li>)}</ul>
    </div>
  );
}
function ProfilePage() {
  const session = getSession()!;
  return <div className="card" data-testid="customer-profile"><h1>Profile</h1><p>{session.name}</p><p className="muted">{session.email}</p><p className="muted">Customer id: {session.customerId}</p></div>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Shell><HomePage /></Shell>} />
      <Route path="/explore/projects" element={<Shell><ProjectsPage /></Shell>} />
      <Route path="/explore/projects/:projectId" element={<Shell><ProjectDetail /></Shell>} />
      <Route path="/explore/plots" element={<Shell><ExplorePlots /></Shell>} />
      <Route path="/explore/plots/:plotId" element={<Shell><PlotDetail /></Shell>} />
      <Route path="/account/bookings" element={<Shell><BookingsPage /></Shell>} />
      <Route path="/account/properties" element={<Shell><PropertiesPage /></Shell>} />
      <Route path="/account/payments" element={<Shell><PaymentsPage /></Shell>} />
      <Route path="/account/schedule" element={<Shell><SchedulePage /></Shell>} />
      <Route path="/account/receipts" element={<Shell><ReceiptsPage /></Shell>} />
      <Route path="/account/documents" element={<Shell><MyDocuments /></Shell>} />
      <Route path="/account/notifications" element={<Shell><NotificationsPage /></Shell>} />
      <Route path="/account/support" element={<Shell><div className="card"><h1>Support</h1><p className="muted">Raise a ticket (client-test stub).</p><button className="btn" type="button">Contact support</button></div></Shell>} />
      <Route path="/account/profile" element={<Shell><ProfilePage /></Shell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
