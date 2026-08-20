// Mock operational data for Bhairava (real-estate plot sales OS).
// Replace with Lovable Cloud tables when the backend is wired up.

export type PlotStatus = "available" | "reserved" | "booked" | "registered" | "resale";

export interface Plot {
  id: string;
  number: string;
  projectId: string;
  areaSqYd: number;
  facing: "East" | "West" | "North" | "South";
  pricePerSqYd: number;
  status: PlotStatus;
  customerId?: string | undefined;
  agentId?: string | undefined;
  /** normalized polygon points (0-100 space) for the SVG layout canvas */
  points: [number, number][];
}

export type Facing = "North" | "South" | "East" | "West";
export type CornerType =
  | "Not corner"
  | "North-East"
  | "North-West"
  | "South-East"
  | "South-West";

/** Reusable plot template so admins don't retype 200 identical plots. */
export interface PlotType {
  id: string;
  name: string;
  areaSqYd: number;
  lengthFt: number;
  widthFt: number;
  facingAllowed: Facing[];
  category: "Standard" | "Premium" | "Commercial" | "Irregular";
}

/** Rate card: base rate plus additive premiums per sq yd. */
export interface PricingRules {
  baseRatePerSqYd: number;
  facingPremium: Record<Facing, number>;
  cornerPremium: number;
  featurePremium: Record<string, number>;
}

export interface ProjectAmenity {
  id: string;
  name: string;
  group: string;
  status: "Planned" | "In progress" | "Completed";
  completion: number;
  photos: number;
  note?: string;
}

/** A real, individually addressable plot in the project inventory. */
export interface InventoryPlot {
  id: string;
  number: string;
  block?: string;
  phase?: string;
  typeId?: string;
  areaSqYd: number;
  lengthFt: number;
  widthFt: number;
  facing: Facing;
  corner: CornerType;
  roadWidthFt: number;
  features: string[];
  category: PlotType["category"];
  rateOverride?: number;
  status: PlotStatus;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  location: string;
  city: string;
  totalPlots: number;
  soldPlots: number;
  launchDate: string;
  status: "Draft" | "Active" | "Pre-launch" | "Sold out" | "On hold" | "Inactive";
  /** Separate sales capability — a project can be Active AND resale-available. */
  resaleAvailable?: boolean;
  valueCr: number;
  collectedCr: number;
  approvals: string[];
  manager: string;
  description?: string;
  reraNumber?: string;
  address?: string;
  pincode?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  highlights?: string[];
  layoutImage?: string;
  /* extended project workspace configuration */
  projectType?: "Plotted development" | "Villa plots" | "Farm plots" | "Commercial plots";
  village?: string;
  mandal?: string;
  district?: string;
  totalArea?: number;
  areaUnit?: "Acres" | "Sq Yards" | "Sq Ft" | "Hectares";
  expectedCompletion?: string;
  coverImage?: string;
  brochure?: string;
  plotTypes?: PlotType[];
  pricing?: PricingRules;
  amenities?: ProjectAmenity[];
  inventory?: InventoryPlot[];
  agents?: string[];
  settings?: {
    reservationDays: number;
    bookingAdvancePct: number;
    allowAgentDiscount: boolean;
    requireApproval: boolean;
  };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  stage: "Lead" | "Site visit" | "Reserved" | "Booked" | "Registered";
  agentId: string;
  plots: string[];
  totalValue: number;
  paid: number;
  createdAt: string;
  altPhone?: string;
  address?: string;
  state?: string;
  pincode?: string;
  pan?: string;
  aadhaar?: string;
  kycStatus?: "Pending" | "Partial" | "Verified" | "Rejected";
  nomineeName?: string;
  nomineeRelation?: string;
  nomineePhone?: string;
  notes?: string;
}

export interface Agent {
  id: string;
  name: string;
  code: string;
  region: string;
  phone: string;
  bookings: number;
  salesCr: number;
  conversion: number;
  target: number;
  projects: string[];
  status: "Active" | "Inactive";
  email?: string;
  employeeCode?: string;
}

export interface Booking {
  id: string;
  customerId: string;
  plotId: string;
  projectId: string;
  agentId: string;
  amount: number;
  paid: number;
  date: string;
  stage: "Draft" | "Confirmed" | "Agreement" | "Registered" | "Cancelled";
}

export interface Payment {
  id: string;
  bookingId: string;
  customerId: string;
  amount: number;
  mode: "UPI" | "NEFT" | "Cheque" | "Cash" | "Card";
  reference: string;
  date: string;
  status: "Succeeded" | "Pending" | "Failed" | "Refunded";
}

export interface Reservation {
  id: string;
  plotId: string;
  customerId: string;
  agentId: string;
  amount: number;
  createdAt: string;
  expiresAt: string;
  state: "Active" | "Expiring today" | "Expired" | "Converted";
}

const inr = (n: number) => n;

const pick = <T,>(arr: readonly T[], i: number): T =>
  arr[((i % arr.length) + arr.length) % arr.length] as T;


export const projects: Project[] = [
  {
    id: "PRJ-01",
    name: "Bhairava Greenfields",
    code: "BGF",
    location: "Shadnagar",
    city: "Hyderabad",
    totalPlots: 248,
    soldPlots: 171,
    launchDate: "2024-11-12",
    status: "Active",
    valueCr: 184.5,
    collectedCr: 121.3,
    approvals: ["RERA", "HMDA", "DTCP"],
    manager: "Ramesh Iyer",
  },
  {
    id: "PRJ-02",
    name: "Astra Meadows",
    code: "ASM",
    location: "Sadashivpet",
    city: "Hyderabad",
    totalPlots: 164,
    soldPlots: 89,
    launchDate: "2025-02-03",
    status: "Active",
    valueCr: 96.2,
    collectedCr: 44.8,
    approvals: ["RERA", "DTCP"],
    manager: "Kavya Rao",
  },
  {
    id: "PRJ-03",
    name: "Vaayu Enclave",
    code: "VYE",
    location: "Chevella",
    city: "Hyderabad",
    totalPlots: 120,
    soldPlots: 120,
    launchDate: "2023-08-19",
    status: "Sold out",
    valueCr: 71.4,
    collectedCr: 70.9,
    approvals: ["RERA", "HMDA"],
    manager: "Ramesh Iyer",
  },
  {
    id: "PRJ-04",
    name: "Nakshatra Township",
    code: "NKT",
    location: "Yadagirigutta",
    city: "Hyderabad",
    totalPlots: 310,
    soldPlots: 42,
    launchDate: "2026-01-20",
    status: "Pre-launch",
    valueCr: 232.0,
    collectedCr: 18.6,
    approvals: ["DTCP"],
    manager: "Suresh Nair",
  },
  {
    id: "PRJ-05",
    name: "Indra Gardens",
    code: "IND",
    location: "Mokila",
    city: "Hyderabad",
    totalPlots: 96,
    soldPlots: 61,
    launchDate: "2025-06-08",
    status: "On hold",
    valueCr: 88.7,
    collectedCr: 39.2,
    approvals: ["RERA", "HMDA"],
    manager: "Kavya Rao",
  },
];

export const agents: Agent[] = [
  { id: "AGT-01", name: "Priya Menon", code: "PM", region: "West Hyderabad", phone: "+91 98490 11221", bookings: 38, salesCr: 27.4, conversion: 0.31, target: 30, projects: ["PRJ-01", "PRJ-02"], status: "Active" },
  { id: "AGT-02", name: "Arjun Reddy", code: "AR", region: "North Hyderabad", phone: "+91 98490 33440", bookings: 31, salesCr: 22.1, conversion: 0.27, target: 30, projects: ["PRJ-01", "PRJ-04"], status: "Active" },
  { id: "AGT-03", name: "Sneha Kulkarni", code: "SK", region: "Central", phone: "+91 98490 55112", bookings: 26, salesCr: 18.9, conversion: 0.24, target: 25, projects: ["PRJ-02", "PRJ-05"], status: "Active" },
  { id: "AGT-04", name: "Vikram Shetty", code: "VS", region: "South Hyderabad", phone: "+91 98490 77883", bookings: 19, salesCr: 12.6, conversion: 0.19, target: 25, projects: ["PRJ-03", "PRJ-05"], status: "Active" },
  { id: "AGT-05", name: "Deepa Krishnan", code: "DK", region: "East Hyderabad", phone: "+91 98490 99001", bookings: 12, salesCr: 8.2, conversion: 0.16, target: 20, projects: ["PRJ-04"], status: "Inactive" },
];

const firstNames = ["Ananya", "Rahul", "Meera", "Karthik", "Divya", "Sandeep", "Lakshmi", "Naveen", "Pooja", "Harish", "Swathi", "Ravi", "Nithya", "Gopal", "Anjali", "Manoj", "Sruthi", "Bharath", "Keerthi", "Vinod"];
const lastNames = ["Sharma", "Rao", "Patel", "Naidu", "Verma", "Reddy", "Pillai", "Chowdary", "Gupta", "Bose"];
const sources = ["Walk-in", "Referral", "Meta Ads", "Google Ads", "Broker", "Exhibition"];
const stages: Customer["stage"][] = ["Lead", "Site visit", "Reserved", "Booked", "Registered"];

export const customers: Customer[] = Array.from({ length: 42 }, (_, i) => {
  const name = `${pick(firstNames, i)} ${pick(lastNames, i)}`;
  const stage = pick(stages, i);
  const total = inr(2800000 + (i % 9) * 640000);
  return {
    id: `CUS-${String(i + 1).padStart(3, "0")}`,
    name,
    phone: `+91 9${String(700000000 + i * 137911).slice(0, 9)}`,
    email: `${name.toLowerCase().replace(/ /g, ".")}@example.com`,
    city: pick(["Hyderabad", "Bengaluru", "Chennai", "Pune", "Vijayawada"], i),
    source: pick(sources, i),
    stage,
    agentId: pick(agents, i).id,
    plots: [],
    totalValue: total,
    paid: stage === "Registered" ? total : Math.round(total * ((i % 7) / 10 + 0.1)),
    createdAt: `2026-0${(i % 8) + 1}-${String((i % 27) + 1).padStart(2, "0")}`,
  };
});

/** Grid-based plot polygons across a 100x100 canvas, with a curved road band. */
function buildPlots(): Plot[] {
  const out: Plot[] = [];
  const statuses: PlotStatus[] = ["available", "reserved", "booked", "registered", "resale"];
  let n = 0;
  projects.forEach((project, pIdx) => {
    const cols = 12;
    const rows = 8;
    const w = 100 / (cols + 2);
    const h = 100 / (rows + 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === 3 && c % 6 !== 0) continue; // horizontal road
        if (c === 6 && r % 4 !== 0) continue; // vertical road
        n++;
        const x = w * (c + 1) + 0.6;
        const y = h * (r + 1) + 0.6;
        const status = pick(statuses, n + pIdx * 3);
        const idx = out.length;
        out.push({
          id: `PLT-${String(n).padStart(4, "0")}-${project.code}`,
          number: `${project.code}-${String(r * cols + c + 1).padStart(3, "0")}`,
          projectId: project.id,
          areaSqYd: pick([167, 200, 240, 267, 300], r + c),
          facing: pick(["East", "West", "North", "South"] as const, r + c),
          pricePerSqYd: 24000 + ((r * cols + c) % 6) * 1500,
          status,
          customerId: status === "available" ? undefined : pick(customers, idx).id,
          agentId: status === "available" ? undefined : pick(agents, idx).id,
          points: [
            [x, y],
            [x + w - 1.2, y],
            [x + w - 1.2, y + h - 1.2],
            [x, y + h - 1.2],
          ],
        });
      }
    }
  });
  return out;
}

export const plots: Plot[] = buildPlots();

customers.forEach((c) => {
  c.plots = plots.filter((p) => p.customerId === c.id).map((p) => p.id);
});

export const bookings: Booking[] = plots
  .filter((p) => p.status === "booked" || p.status === "registered")
  .slice(0, 60)
  .map((p, i) => {
    const amount = p.areaSqYd * p.pricePerSqYd;
    return {
      id: `BKG-${String(1000 + i)}`,
      customerId: p.customerId!,
      plotId: p.id,
      projectId: p.projectId,
      agentId: p.agentId!,
      amount,
      paid: p.status === "registered" ? amount : Math.round(amount * (0.2 + (i % 6) * 0.12)),
      date: `2026-0${(i % 8) + 1}-${String((i % 27) + 1).padStart(2, "0")}`,
      stage: p.status === "registered" ? "Registered" : pick((["Confirmed", "Agreement", "Draft"] as const), i % 3),
    };
  });

export const payments: Payment[] = bookings.flatMap((b, i) =>
  Array.from({ length: (i % 3) + 1 }, (_, k) => ({
    id: `PAY-${String(5000 + i * 3 + k)}`,
    bookingId: b.id,
    customerId: b.customerId,
    amount: Math.round(b.paid / ((i % 3) + 1)),
    mode: pick(["UPI", "NEFT", "Cheque", "Cash", "Card"] as const, i + k),
    reference: `REF${String(900000 + i * 17 + k)}`,
    date: `2026-0${((i + k) % 8) + 1}-${String(((i + k) % 27) + 1).padStart(2, "0")}`,
    status: pick(["Succeeded", "Succeeded", "Succeeded", "Pending", "Failed"] as const, i + k),
  })),
);

export const reservations: Reservation[] = plots
  .filter((p) => p.status === "reserved")
  .slice(0, 24)
  .map((p, i) => ({
    id: `RSV-${String(300 + i)}`,
    plotId: p.id,
    customerId: p.customerId!,
    agentId: p.agentId!,
    amount: 100000 + (i % 5) * 25000,
    createdAt: `2026-08-${String((i % 18) + 1).padStart(2, "0")}`,
    expiresAt: `2026-08-${String((i % 12) + 19).padStart(2, "0")}`,
    state: pick((["Active", "Active", "Expiring today", "Expired", "Converted"] as const), i % 5),
  }));

export const cashflow = [
  { month: "Jan", collected: 8.4, target: 9, outstanding: 3.1 },
  { month: "Feb", collected: 10.2, target: 10, outstanding: 3.6 },
  { month: "Mar", collected: 12.6, target: 11, outstanding: 4.2 },
  { month: "Apr", collected: 9.8, target: 11.5, outstanding: 5.0 },
  { month: "May", collected: 14.1, target: 12, outstanding: 4.4 },
  { month: "Jun", collected: 16.3, target: 13, outstanding: 3.8 },
  { month: "Jul", collected: 13.7, target: 14, outstanding: 4.9 },
  { month: "Aug", collected: 18.2, target: 15, outstanding: 5.3 },
];

export const salesTrend = [
  { month: "Jan", bookings: 14, siteVisits: 62 },
  { month: "Feb", bookings: 18, siteVisits: 71 },
  { month: "Mar", bookings: 22, siteVisits: 88 },
  { month: "Apr", bookings: 17, siteVisits: 74 },
  { month: "May", bookings: 26, siteVisits: 96 },
  { month: "Jun", bookings: 31, siteVisits: 108 },
  { month: "Jul", bookings: 27, siteVisits: 99 },
  { month: "Aug", bookings: 34, siteVisits: 121 },
];

export interface DocumentRecord {
  id: string;
  name: string;
  type: "Agreement" | "Sale deed" | "KYC" | "Receipt" | "Layout approval" | "NOC";
  customerId: string;
  projectId: string;
  plotId: string;
  verified: "Verified" | "Pending" | "Rejected";
  modified: string;
  sizeKb: number;
}

export const documents: DocumentRecord[] = bookings.slice(0, 36).map((b, i) => ({
  id: `DOC-${String(700 + i)}`,
  name: `${b.id}-${pick((["agreement", "sale-deed", "kyc", "receipt", "layout", "noc"] as const), i % 6)}.pdf`,
  type: pick((["Agreement", "Sale deed", "KYC", "Receipt", "Layout approval", "NOC"] as const), i % 6),
  customerId: b.customerId,
  projectId: b.projectId,
  plotId: b.plotId,
  verified: pick((["Verified", "Verified", "Pending", "Rejected"] as const), i % 4),
  modified: `2026-08-${String((i % 27) + 1).padStart(2, "0")}`,
  sizeKb: 180 + i * 37,
}));

export interface Registration {
  id: string;
  bookingId: string;
  customerId: string;
  plotId: string;
  stage: "Documentation" | "Ready" | "Scheduled" | "Completed";
  slot: string;
  subRegistrar: string;
}

export const registrations: Registration[] = bookings.slice(0, 28).map((b, i) => ({
  id: `REG-${String(400 + i)}`,
  bookingId: b.id,
  customerId: b.customerId,
  plotId: b.plotId,
  stage: pick((["Documentation", "Ready", "Scheduled", "Completed"] as const), i % 4),
  slot: `2026-09-${String((i % 27) + 1).padStart(2, "0")} · ${10 + (i % 6)}:00`,
  subRegistrar: pick(["Shamshabad", "Rajendranagar", "Ibrahimpatnam", "Medchal"], i),
}));

export interface Task {
  id: string;
  title: string;
  due: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  done: boolean;
  linked: string;
}

export const tasks: Task[] = Array.from({ length: 18 }, (_, i) => ({
  id: `TSK-${String(100 + i)}`,
  title: pick([
    "Follow up on pending agreement",
    "Collect balance instalment",
    "Schedule site visit",
    "Verify KYC documents",
    "Confirm registration slot",
    "Send revised price sheet",
  ], i),
  due: `2026-08-${String((i % 27) + 1).padStart(2, "0")}`,
  owner: pick(agents, i).name,
  priority: pick((["High", "Medium", "Low"] as const), i % 3),
  done: i % 5 === 0,
  linked: pick(bookings, i).id,
}));

export interface NotificationItem {
  id: string;
  kind: "booking" | "payment" | "reservation" | "document" | "system";
  title: string;
  detail: string;
  time: string;
  unread: boolean;
}

export const notifications: NotificationItem[] = Array.from({ length: 16 }, (_, i) => ({
  id: `NTF-${String(200 + i)}`,
  kind: pick((["booking", "payment", "reservation", "document", "system"] as const), i % 5),
  title: pick([
    "New booking confirmed",
    "Payment received",
    "Reservation expiring today",
    "Document awaiting verification",
    "Nightly sync completed",
  ], i),
  detail: `${pick(projects, i).name} · ${pick(customers, i).name}`,
  time: `${(i % 12) + 1}h ago`,
  unread: i < 6,
}));

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: "Founder" | "Administrator" | "Sales" | "Finance" | "Viewer";
  status: "Active" | "Invited" | "Suspended";
  lastActive: string;
}

export const appUsers: AppUser[] = [
  { id: "USR-01", name: "Vijay Bhaskar", email: "vijay@bhairava.in", role: "Founder", status: "Active", lastActive: "2 min ago" },
  { id: "USR-02", name: "Ramesh Iyer", email: "ramesh@bhairava.in", role: "Administrator", status: "Active", lastActive: "1 h ago" },
  { id: "USR-03", name: "Kavya Rao", email: "kavya@bhairava.in", role: "Sales", status: "Active", lastActive: "3 h ago" },
  { id: "USR-04", name: "Suresh Nair", email: "suresh@bhairava.in", role: "Finance", status: "Active", lastActive: "Yesterday" },
  { id: "USR-05", name: "Deepa Krishnan", email: "deepa@bhairava.in", role: "Sales", status: "Suspended", lastActive: "12 Jul 2026" },
  { id: "USR-06", name: "Anil Kumar", email: "anil@bhairava.in", role: "Viewer", status: "Invited", lastActive: "—" },
];

export interface AuditEntry {
  id: string;
  time: string;
  actor: string;
  action: string;
  object: string;
  before: string;
  after: string;
}

export const auditLog: AuditEntry[] = Array.from({ length: 24 }, (_, i) => ({
  id: `AUD-${String(9000 + i)}`,
  time: `2026-08-${String(19 - (i % 14)).padStart(2, "0")} ${String(9 + (i % 9)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
  actor: pick(appUsers, i).name,
  action: pick(["updated plot status", "created booking", "voided payment", "invited user", "edited price", "verified document"], i),
  object: pick([pick(plots, i).id, pick(bookings, i).id, pick(payments, i).id], i),
  before: pick(["available", "draft", "₹0", "—", "₹24,000", "Pending"], i),
  after: pick(["reserved", "confirmed", "₹1,20,000", "Sales", "₹25,500", "Verified"], i),
}));

export const formatINR = (n: number, opts: { compact?: boolean } = {}) => {
  if (opts.compact) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  }
  return `₹${n.toLocaleString("en-IN")}`;
};

export const byId = <T extends { id: string }>(list: T[], id?: string) => list.find((x) => x.id === id);
