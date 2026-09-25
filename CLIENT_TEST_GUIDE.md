# Bhairava CLIENT TEST GUIDE

**Branch:** `feat/main-p0-p1-project-overview-setup`  
**Source of truth:** `MAIN app` · `MAIN-agent` · `MAIN-customer` · `MAIN-agent-expo` · `MAIN-customer-expo`  
**Rule:** Local only for this delivery — do **not** push unless explicitly asked.

---

## 1. Fixed ports (local / LAN)

| App | Folder | Port | URL |
|-----|--------|------|-----|
| MAIN Admin | `MAIN app` | **3000** | http://localhost:3000 |
| MAIN-agent Web | `MAIN-agent` | **5174** | http://localhost:5174 |
| MAIN-customer Web | `MAIN-customer` | **5175** | http://localhost:5175 |
| Agent Expo | `MAIN-agent-expo` | Metro (8081+) | `npm start` in folder |
| Customer Expo | `MAIN-customer-expo` | Metro (8081+) | `npm start` in folder |

**LAN (phone on same Wi-Fi):** replace `localhost` with this PC's IPv4 (often `192.168.31.35` — confirm with `ipconfig`).

Examples:
- Admin: `http://192.168.31.35:3000/login`
- Agent: `http://192.168.31.35:5174/login`
- Customer: `http://192.168.31.35:5175/login`

No obscure deep links required — every app opens on `/login` then home nav.

---

## 2. Start scripts

From repo root (`C:\Users\HP\Downloads\Bhairava App`):

```powershell
# All three webs (MAIN + agent + customer) with fixed ports
npm run dev:client

# Or PowerShell helper (also opens browsers)
powershell -ExecutionPolicy Bypass -File .\scripts\start-all-web.ps1

# Expo (separate terminals)
npm run dev:agent-expo
npm run dev:customer-expo
```

Individual:
```powershell
npm run dev:main
npm run dev:main-agent
npm run dev:main-customer
```

---

## 3. Demo accounts (stable · never real PII)

### MAIN Admin (port 3000)

| Role | Email | Password | Expected access |
|------|-------|----------|-----------------|
| Founder / Admin ops | `founder@bhairava.com` | `founder@2026` | Full ops |
| Administrator | `admin@bhairava.com` | `admin@2026` | Full ops (primary demo) |
| Finance | `finance@bhairava.com` | `finance@2026` | Finance-operational |
| Viewer | `viewer@bhairava.com` | `viewer@2026` | Read-only |

> Role can also be switched inside **Settings → Users** (existing demo helper).

### MAIN-agent Web + Expo (port 5174 / Metro)

| Identity | Email | Password | Proof |
|----------|-------|----------|-------|
| Agent 1 | `agent1@bhairava.com` | `agent1@2026` | Owns Ananya / BK-01 / LED-01 |
| Agent 2 | `agent2@bhairava.com` | `agent2@2026` | Owns Rahul+Sneha / BK-02 / LED-02 · different PII |

Legacy alias still documented in older notes: `agent@bhairava.com` was replaced by **agent1** for clarity.

### MAIN-customer Web + Expo (port 5175 / Metro)

| Identity | Email | Password | Proof |
|----------|-------|----------|-------|
| Customer 1 | `customer1@bhairava.com` | `customer1@2026` | Booking BK-01 · plot A-103 · own payments/docs |
| Customer 2 | `customer2@bhairava.com` | `customer2@2026` | Reservation A-102 · different docs/payments |

---

## 4. Privacy checklist (must pass)

**Agent1 ≠ Agent2**
- [ ] Agent1 Plots: Ananya visible on A-103; Rahul on A-102 shows **PII hidden**
- [ ] Agent2 Plots: Rahul visible; Ananya on A-103 shows **PII hidden**
- [ ] Leads / customers / bookings / commissions / visits scoped to signed-in agent
- [ ] Documents exclude `INTERNAL` vault

**Customer1 ≠ Customer2**
- [ ] Explore plots: statuses public; pricing/detail only for AVAILABLE / RESALE_AVAILABLE
- [ ] Never shows other buyers on RESERVED / BOOKED / SOLD / REGISTERED
- [ ] My bookings / payments / receipts / documents are own-only
- [ ] No project document vault

---

## 5. Client rehearsal journeys

### A. Admin (MAIN :3000)
1. Open http://localhost:3000/login
2. Sign in as `admin@bhairava.com` / `admin@2026`
3. Walk Projects → Plots → Leads → Customers → Bookings → Finance (Payments / Schedule / Receipts / Commissions)
4. Sign out; sign in as `finance@bhairava.com` and `viewer@bhairava.com` to confirm role posture

### B. Agent (MAIN-agent :5174)
1. Login Agent 1 → Home stats → Projects → Plot detail → Leads → Customers → Visits → Bookings → Commissions → Documents → Profile
2. Sign out → Login Agent 2 → confirm different customers and redacted PII

### C. Customer (MAIN-customer :5175)
1. Login Customer 1 → Explore → Plot availability → My properties → Bookings → Payments → Receipts → Documents → Profile
2. Sign out → Login Customer 2 → confirm different property/docs; reserved plot has no other-buyer PII

### D. Expo
1. `cd MAIN-agent-expo && npm start` → bottom nav Home · Explore · Leads · Visits · More
2. `cd MAIN-customer-expo && npm start` → bottom nav Home · Explore · My Property · Payments · Profile

Screenshots: save under `qa-screenshots/client-rehearsal-*.png`.

---

## 6. Quality commands (morning)

```powershell
cd "C:\Users\HP\Downloads\Bhairava App"

# Web unit / type / build
npm run test:agent
npm run test:customer
npm run typecheck:agent
npm run typecheck:customer
npm run build:agent
npm run build:customer
npm run test --prefix "MAIN app"
npm run build --prefix "MAIN app"

# Expo
npm run typecheck --prefix MAIN-agent-expo
npm run typecheck --prefix MAIN-customer-expo
npm run test --prefix MAIN-agent-expo
npm run test --prefix MAIN-customer-expo
# optional export smoke
npm run export --prefix MAIN-agent-expo
npm run export --prefix MAIN-customer-expo

# Launch for live demo
npm run dev:client
```

---

## 7. Notes

- Persistence is **local/mock** (localStorage / AsyncStorage + in-memory seed) for client test.
- Do not invent new business rules — domain projections live in each app's `src/lib/projections.ts` (copied from MAIN-agent / MAIN-customer SoT).
- No deploy credentials required for this delivery; LAN URLs above are enough for phone testing.


---

## 8. Latest rehearsal snapshot (local)

Captured under \qa-screenshots/client-rehearsal-*.png\ and \qa-screenshots/client-rehearsal-report.json\.

- Admin: founder/admin/finance/viewer login OK on :3000
- Agent1 plots: Ananya visible, Rahul **PII hidden**; Agent2 inverse
- Agent2 customers: Rahul + Sneha only (not Ananya)
- Customer explore: no other-buyer PII; reserved plot status-only
- Customer1 bookings BK-01; Customer2 no BK-01; docs entitled-only; INTERNAL vault excluded
