export type PlotStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "BOOKED"
  | "UNDER_DOCUMENTATION"
  | "SOLD"
  | "REGISTERED"
  | "RESALE_AVAILABLE"
  | "BLOCKED"
  | "CANCELLED";

export interface Project {
  id: string;
  name: string;
  code: string;
  city: string;
  agentVisible: boolean;
  customerListed: boolean;
}

export interface Plot {
  id: string;
  projectId: string;
  number: string;
  status: PlotStatus;
  area: number;
  price: number;
  facing: string;
  customerId?: string;
  agentId?: string;
}

export interface Person {
  id: string;
  name: string;
  phone: string;
  email: string;
  agentId: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  stage: string;
  agentId: string;
  projectId: string;
}

export interface Booking {
  id: string;
  projectId: string;
  plotId: string;
  customerId: string;
  agentId: string;
  amount: number;
  status: string;
}

export interface Payment {
  id: string;
  customerId: string;
  bookingId: string;
  amount: number;
  status: string;
  dueDate: string;
  paidAt?: string;
}

export interface Visit {
  id: string;
  agentId: string;
  customerId: string;
  projectId: string;
  when: string;
  status: string;
}

export interface Reservation {
  id: string;
  agentId: string;
  customerId: string;
  plotId: string;
  status: string;
}

export interface Commission {
  id: string;
  agentId: string;
  bookingId: string;
  amount: number;
  status: string;
}

export interface Doc {
  id: string;
  projectId: string;
  title: string;
  visibility: "INTERNAL" | "AGENT_VISIBLE" | "CUSTOMER_PROFILE_RELATED";
  customerId?: string;
}

export interface NotificationItem {
  id: string;
  audience: "agent" | "customer" | "admin";
  ownerId: string;
  title: string;
  body: string;
}

export interface PlatformSeed {
  projects: Project[];
  plots: Plot[];
  customers: Person[];
  leads: Lead[];
  bookings: Booking[];
  payments: Payment[];
  visits: Visit[];
  reservations: Reservation[];
  commissions: Commission[];
  documents: Doc[];
  notifications: NotificationItem[];
}

/** Stable client-test identities — never real PII */
export const ADMIN_DEMOS = [
  { id: "ADM-FOUNDER", email: "founder@bhairava.com", password: "founder@2026", name: "Vijay Founder", role: "Founder" as const, app: "MAIN" as const, port: 3000 },
  { id: "ADM-ADMIN", email: "admin@bhairava.com", password: "admin@2026", name: "Vijay Bhaskar", role: "Administrator" as const, app: "MAIN" as const, port: 3000 },
  { id: "ADM-FINANCE", email: "finance@bhairava.com", password: "finance@2026", name: "Suresh Finance", role: "Finance" as const, app: "MAIN" as const, port: 3000 },
  { id: "ADM-VIEWER", email: "viewer@bhairava.com", password: "viewer@2026", name: "Anil Viewer", role: "Viewer" as const, app: "MAIN" as const, port: 3000 },
] as const;

export const AGENT_DEMOS = [
  { id: "AGT-01", email: "agent1@bhairava.com", password: "agent1@2026", name: "Kavya Agent", app: "MAIN-agent" as const, port: 5174 },
  { id: "AGT-02", email: "agent2@bhairava.com", password: "agent2@2026", name: "Arjun Agent", app: "MAIN-agent" as const, port: 5174 },
] as const;

export const CUSTOMER_DEMOS = [
  { id: "CUS-01", email: "customer1@bhairava.com", password: "customer1@2026", name: "Ananya Rao", app: "MAIN-customer" as const, port: 5175 },
  { id: "CUS-02", email: "customer2@bhairava.com", password: "customer2@2026", name: "Rahul Mehta", app: "MAIN-customer" as const, port: 5175 },
] as const;

/** Back-compat aliases used by older screens */
export const AGENT_DEMO = AGENT_DEMOS[0];
export const CUSTOMER_DEMO = CUSTOMER_DEMOS[0];

export const PLATFORM_SEED: PlatformSeed = {
  projects: [
    { id: "PRJ-01", name: "Bhairava Greens", code: "BG", city: "Hyderabad", agentVisible: true, customerListed: true },
    { id: "PRJ-02", name: "Bhairava Heights", code: "BH", city: "Hyderabad", agentVisible: true, customerListed: true },
  ],
  plots: [
    { id: "PLT-101", projectId: "PRJ-01", number: "A-101", status: "AVAILABLE", area: 200, price: 4200000, facing: "East" },
    { id: "PLT-102", projectId: "PRJ-01", number: "A-102", status: "RESERVED", area: 220, price: 4600000, facing: "North", customerId: "CUS-02", agentId: "AGT-02" },
    { id: "PLT-103", projectId: "PRJ-01", number: "A-103", status: "BOOKED", area: 240, price: 5100000, facing: "West", customerId: "CUS-01", agentId: "AGT-01" },
    { id: "PLT-104", projectId: "PRJ-01", number: "A-104", status: "SOLD", area: 210, price: 4800000, facing: "South", customerId: "CUS-03", agentId: "AGT-02" },
    { id: "PLT-201", projectId: "PRJ-02", number: "B-201", status: "RESALE_AVAILABLE", area: 300, price: 6200000, facing: "East", customerId: "CUS-01", agentId: "AGT-01" },
    { id: "PLT-202", projectId: "PRJ-02", number: "B-202", status: "BLOCKED", area: 180, price: 3900000, facing: "North" },
  ],
  customers: [
    { id: "CUS-01", name: "Ananya Rao", phone: "9000000001", email: "customer1@bhairava.com", agentId: "AGT-01" },
    { id: "CUS-02", name: "Rahul Mehta", phone: "9000000002", email: "customer2@bhairava.com", agentId: "AGT-02" },
    { id: "CUS-03", name: "Sneha Iyer", phone: "9000000003", email: "sneha@example.com", agentId: "AGT-02" },
  ],
  leads: [
    { id: "LED-01", name: "Kiran Patel", phone: "9000000011", stage: "Qualified", agentId: "AGT-01", projectId: "PRJ-01" },
    { id: "LED-02", name: "Meera Shah", phone: "9000000012", stage: "New", agentId: "AGT-02", projectId: "PRJ-02" },
    { id: "LED-03", name: "Dev Kapoor", phone: "9000000013", stage: "Site visit", agentId: "AGT-01", projectId: "PRJ-02" },
  ],
  bookings: [
    { id: "BK-01", projectId: "PRJ-01", plotId: "PLT-103", customerId: "CUS-01", agentId: "AGT-01", amount: 5100000, status: "Confirmed" },
    { id: "BK-02", projectId: "PRJ-01", plotId: "PLT-104", customerId: "CUS-03", agentId: "AGT-02", amount: 4800000, status: "Completed" },
  ],
  payments: [
    { id: "PAY-01", customerId: "CUS-01", bookingId: "BK-01", amount: 510000, status: "Paid", dueDate: "2026-08-01", paidAt: "2026-08-01" },
    { id: "PAY-02", customerId: "CUS-01", bookingId: "BK-01", amount: 1020000, status: "Due", dueDate: "2026-10-01" },
    { id: "PAY-03", customerId: "CUS-02", bookingId: "BK-02", amount: 200000, status: "Paid", dueDate: "2026-07-15", paidAt: "2026-07-14" },
  ],
  visits: [
    { id: "VIS-01", agentId: "AGT-01", customerId: "CUS-01", projectId: "PRJ-01", when: "2026-09-20 10:00", status: "Completed" },
    { id: "VIS-02", agentId: "AGT-02", customerId: "CUS-02", projectId: "PRJ-01", when: "2026-09-22 16:00", status: "Scheduled" },
  ],
  reservations: [
    { id: "RSV-01", agentId: "AGT-02", customerId: "CUS-02", plotId: "PLT-102", status: "Active" },
  ],
  commissions: [
    { id: "COM-01", agentId: "AGT-01", bookingId: "BK-01", amount: 102000, status: "Accrued" },
    { id: "COM-02", agentId: "AGT-02", bookingId: "BK-02", amount: 96000, status: "Paid" },
  ],
  documents: [
    { id: "DOC-INT", projectId: "PRJ-01", title: "Internal cost sheet", visibility: "INTERNAL" },
    { id: "DOC-AG", projectId: "PRJ-01", title: "Agent brochure", visibility: "AGENT_VISIBLE" },
    { id: "DOC-CU1", projectId: "PRJ-01", title: "Booking acknowledgment — Ananya", visibility: "CUSTOMER_PROFILE_RELATED", customerId: "CUS-01" },
    { id: "DOC-CU2", projectId: "PRJ-01", title: "Reservation letter — Rahul", visibility: "CUSTOMER_PROFILE_RELATED", customerId: "CUS-02" },
  ],
  notifications: [
    { id: "NTF-A1", audience: "agent", ownerId: "AGT-01", title: "Visit completed", body: "Site visit VIS-01 marked complete." },
    { id: "NTF-A2", audience: "agent", ownerId: "AGT-02", title: "Reservation active", body: "Plot A-102 reserved for your customer." },
    { id: "NTF-C1", audience: "customer", ownerId: "CUS-01", title: "Payment due", body: "₹10,20,000 due on 1 Oct 2026." },
    { id: "NTF-C2", audience: "customer", ownerId: "CUS-02", title: "Reservation confirmed", body: "Your hold on A-102 is active." },
  ],
};

export function findAgentDemo(email: string, password: string) {
  return AGENT_DEMOS.find((a) => a.email === email.trim().toLowerCase() && a.password === password) ?? null;
}

export function findCustomerDemo(email: string, password: string) {
  return CUSTOMER_DEMOS.find((c) => c.email === email.trim().toLowerCase() && c.password === password) ?? null;
}

export function findAdminDemo(email: string, password: string) {
  return ADMIN_DEMOS.find((a) => a.email === email.trim().toLowerCase() && a.password === password) ?? null;
}
