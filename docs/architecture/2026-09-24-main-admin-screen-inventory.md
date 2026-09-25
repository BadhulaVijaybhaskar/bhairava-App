# MAIN Admin — Screen Inventory

**Status:** Working map (2026-09-24)  
**Based on:** Locked three-app architecture + current MAIN TanStack routes (`MAIN app/src/routes`, `app-shell.tsx` nav)  
**App:** MAIN only (admin OS)

Legend: **Have** = route + nav (or clear entry) · **Partial** = route exists but weak/missing nav or incomplete vs lock · **Missing** = not in MAIN yet · **Rename** = exist under different label/group

---

## 1. Locked nav vs current MAIN

### Overview

| Architecture | Current MAIN | Status | Route(s) |
|--------------|--------------|--------|----------|
| Dashboard | Dashboard | Have | `/` |
| — | Notifications (Overview) | Have (also under Management in lock) | `/notifications` |

### Portfolio

| Architecture | Current MAIN | Status | Route(s) |
|--------------|--------------|--------|----------|
| Projects | Projects (Inventory) | Have | `/projects`, `/projects/$projectId` |
| Plots | Plot inventory | Have | `/plots` |
| Layouts | Live plot layout + Layout editor | Have (split) | `/plots/layout`, `/plots/editor` |
| — | New project / New plot wizards | Have (Onboarding group) | `/onboarding/project`, `/onboarding/plot` |

### Sales

| Architecture | Current MAIN | Status | Route(s) |
|--------------|--------------|--------|----------|
| Customers | Customers (Relationships) | Have | `/customers`, `/customers/$customerId`, `/onboarding/customer` |
| Agents | Agents (Relationships) | Have | `/agents`, `/agents/$agentId`, `/onboarding/agent` |
| Leads | — | **Missing** | — |
| Site Visits | Site visits | Have | `/site-visits`, `/site-visits/new`, `/onboarding/visit` |
| Reservations | Reservations | Have | `/reservations`, `/onboarding/reservation` |
| Bookings | Bookings | Have | `/bookings`, `/bookings/$bookingId`, `/onboarding/booking` |

### Finance

| Architecture | Current MAIN | Status | Route(s) |
|--------------|--------------|--------|----------|
| Payments | Payments | Have | `/payments`, `/payments/$paymentId` |
| Collections | Collections | Have | `/collections` |
| Receipts | Receipt detail only | **Partial** | `/receipts/$paymentId` (no list / nav item) |
| Commissions | — | **Missing** | — |
| — | Payment schedule | Have (extra vs lock) | `/schedule` |

### Operations

| Architecture | Current MAIN | Status | Route(s) |
|--------------|--------------|--------|----------|
| Documents | Documents (under Sales group today) | Have | `/documents` |
| Registrations | Registrations (under Sales group today) | Have | `/registrations` |
| Resale | Resale inventory (under Inventory today) | Have | `/resale` |

### Management

| Architecture | Current MAIN | Status | Route(s) |
|--------------|--------------|--------|----------|
| Members & Permissions | Users & roles / Members & roles | Have | `/settings/users` |
| Reports | Sales / Collections / Inventory / Agent performance | Have | `/reports/sales`, `/reports/collections`, `/reports/inventory`, `/reports/agents` |
| Audit Logs | Audit logs | Have | `/settings/audit` |
| Notifications | Notifications | Have | `/notifications` |

### Company

| Architecture | Current MAIN | Status | Route(s) |
|--------------|--------------|--------|----------|
| Company Settings | Company settings | Have | `/settings/company` |
| Billing (Founder only) | — | **Missing** | — |
| Danger Zone (Founder only) | — | **Missing** | — |

### Auth / shell (not in architecture nav, required)

| Screen | Status | Route |
|--------|--------|-------|
| Login | Have | `/login` |

---

## 2. Full route catalog (as built today)

| Route | Screen intent |
|-------|----------------|
| `/` | Dashboard |
| `/login` | Auth |
| `/notifications` | Notification center |
| `/onboarding/project` | Create project wizard |
| `/onboarding/plot` | Create plot wizard |
| `/onboarding/customer` | Create customer wizard |
| `/onboarding/agent` | Create agent wizard |
| `/onboarding/visit` | Create site visit wizard |
| `/onboarding/reservation` | Create reservation wizard |
| `/onboarding/booking` | Create booking wizard |
| `/projects` | Project list |
| `/projects/$projectId` | Project detail |
| `/plots` | Plot inventory list |
| `/plots/layout` | Live plot layout map |
| `/plots/editor` | Layout editor |
| `/resale` | Resale inventory |
| `/customers` | Customer list |
| `/customers/$customerId` | Customer detail |
| `/agents` | Agent list |
| `/agents/$agentId` | Agent detail |
| `/site-visits` | Site visit list |
| `/site-visits/new` | New site visit |
| `/reservations` | Reservation list |
| `/bookings` | Booking list |
| `/bookings/$bookingId` | Booking detail |
| `/registrations` | Registration pipeline |
| `/documents` | Document vault (admin) |
| `/collections` | Collections board |
| `/payments` | Payment list |
| `/payments/$paymentId` | Payment detail |
| `/receipts/$paymentId` | Receipt view |
| `/schedule` | Payment schedule |
| `/reports/sales` | Sales report |
| `/reports/collections` | Collections report |
| `/reports/inventory` | Inventory report |
| `/reports/agents` | Agent performance |
| `/settings/users` | Members & roles |
| `/settings/audit` | Audit logs |
| `/settings/company` | Company settings |

Mobile bottom tabs today: Home · Plots · Customers · Money → `/`, `/plots/layout`, `/customers`, `/collections`.

---

## 3. Gaps to close (priority for Admin OS)

1. **Leads** — list + detail + stages (New → … → Booked / Lost); absent entirely.  
2. **Commissions** — admin commission rules + agent payout view.  
3. **Receipts** — elevate from payment-linked detail to list/nav under Finance.  
4. **Billing** — Founder-only company billing.  
5. **Danger Zone** — Founder-only destructive company actions.  
6. **Nav regroup** — optional: rename Inventory→Portfolio, Relationships+parts of Sales→Sales, Documents/Registrations/Resale→Operations, align labels with the locked architecture (no feature loss).

Keep as Admin strengths (do not strip for agent/customer later):

- Onboarding wizards + FAB quick actions  
- Layout editor + live layout  
- Full document vault  
- Reports suite  
- Members / audit / company  

---

## 4. Suggested screen IDs (for later prompts / tickets)

Use these stable IDs when generating or refining Admin screens:

| ID | Screen |
|----|--------|
| `admin.dashboard` | Dashboard |
| `admin.projects.list` / `admin.projects.detail` | Projects |
| `admin.plots.list` / `admin.plots.layout` / `admin.plots.editor` | Plots & layouts |
| `admin.customers.list` / `admin.customers.detail` | Customers |
| `admin.agents.list` / `admin.agents.detail` | Agents |
| `admin.leads.list` / `admin.leads.detail` | Leads (**new**) |
| `admin.site_visits.*` | Site visits |
| `admin.reservations.*` | Reservations |
| `admin.bookings.*` | Bookings |
| `admin.payments.*` / `admin.collections` / `admin.receipts` / `admin.schedule` | Finance |
| `admin.commissions` | Commissions (**new**) |
| `admin.documents` / `admin.registrations` / `admin.resale` | Operations |
| `admin.reports.*` | Reports |
| `admin.settings.members` / `admin.settings.audit` / `admin.settings.company` | Management |
| `admin.company.billing` / `admin.company.danger` | Company Founder (**new**) |
| `admin.onboarding.*` | Create wizards |

---

## 5. Next decisions (product)

A. Build **missing screens** first (Leads → Commissions → Receipts list → Billing/Danger).  
B. **Regroup nav** to match architecture labels without new screens.  
C. Deepen an existing area (e.g. Project detail as full Portfolio OS).  

---

*Companion to `2026-09-24-bhairava-three-app-architecture.md`. MAIN-agent and MAIN-customer inventories are separate docs.*

---

## Plot status vocabulary (locked)

Canonical plot commercial statuses (see Portfolio OS):

`AVAILABLE | RESERVED | BOOKED | UNDER_DOCUMENTATION | SOLD | REGISTERED | RESALE_AVAILABLE | BLOCKED | CANCELLED`

Normal path: AVAILABLE → RESERVED → BOOKED → UNDER_DOCUMENTATION → SOLD → REGISTERED.  
No `HOLD` — use `BLOCKED` for administrative unavailability. Preserve status history; exceptional transitions require reason + audit.
