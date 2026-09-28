# Bhairava Real Estate Platform Ã¢â‚¬â€ Three-App Architecture

**Status:** LOCKED (2026-09-24)  
**Scope:** Core application architecture for MAIN / MAIN-agent / MAIN-customer  
**Rule:** Treat this document as source of truth before Admin screen generation or implementation prompts.

---

## 1. Product shape

```text
BHAIRAVA REAL ESTATE PLATFORM
|
|-- MAIN              Admin / Founder / Finance / Viewer (later: Sales Manager)
|-- MAIN-agent        Sales Agent application
|-- MAIN-customer     Customer application
```

### Mission statements

| App | Mission |
|-----|---------|
| **MAIN** | Run Bhairava. |
| **MAIN-agent** | Sell Bhairava properties. |
| **MAIN-customer** | Explore Bhairava and manage my property. |

---

## 2. Shared platform (one backend)

All three apps share:

- Authentication service
- PostgreSQL database
- API / backend
- Projects and plot inventory
- Booking engine
- Payment engine
- Document storage
- Notifications
- Design system
- Shared TypeScript types
- Shared validation
- Shared utilities

Each app has **separate**:

- Navigation
- Permissions
- Screens / information density

**Security is enforced on the server**, not only by hiding UI.

---

## 3. Recommended monorepo layout

```text
bhairava-real-estate/
|-- apps/
|   |-- admin/          # MAIN
|   |-- agent/          # MAIN-agent
|   |-- customer/       # MAIN-customer
|-- packages/
|   |-- ui/
|   |-- design-system/
|   |-- auth/
|   |-- api-client/
|   |-- types/
|   |-- validation/
|   |-- permissions/
|   |-- utilities/
|   |-- config/
|-- backend/
|-- database/
|-- docs/
```

### Design density (same product family)

| App | Density | Priority |
|-----|---------|----------|
| MAIN | High | Desktop-first |
| MAIN-agent | Medium | Tablet/mobile-friendly; fast plot search + sales actions |
| MAIN-customer | Low | Mobile-first; more imagery; simpler navigation |

---

## 4. MAIN Ã¢â‚¬â€ Admin OS

Complete Bhairava operational system.

### Users

- Founder
- Administrator
- Finance
- Viewer
- Later: Sales Manager

### Navigation

```text
Dashboard

PORTFOLIO
  Projects
  Plots
  Layouts

SALES
  Customers
  Agents
  Leads
  Site Visits
  Reservations
  Bookings

FINANCE
  Payments
  Collections
  Receipts
  Commissions

OPERATIONS
  Documents
  Registrations
  Resale

MANAGEMENT
  Members & Permissions
  Reports
  Audit Logs
  Notifications

COMPANY
  Company Settings
  Billing              Ã¢â‚¬â€ Founder only
  Danger Zone          Ã¢â‚¬â€ Founder only
```

### Admin capabilities (full project management)

Admin can:

- Create / edit projects
- Configure phases, blocks, plot types, dimensions, facing, corner plots, road widths
- Configure premium features, price rules, amenities
- Upload project images, documents, master layout
- Map plots; create / edit plots; change plot status
- Assign agents
- Manage customers, bookings, payments, registration, resale
- Manage members, reports, audit, company settings

---

## 5. MAIN-agent Ã¢â‚¬â€ Sales Agent App

**Not an Admin-lite app.** Focused sales workspace.

### Navigation

```text
Home

EXPLORE
  Projects
  Plot Availability

SALES
  My Leads
  My Customers
  Site Visits
  Reservations
  Bookings

MONEY
  Collections
  Commissions

RESOURCES
  Project Documents
  Notifications

ACCOUNT
  My Profile
```

### Projects

Browse projects the agent is permitted to sell. Read-only project sales content:

- Name, location, description, amenities, images
- Brochure, master layout, plot types, pricing
- Available plots, agent-approved documents, map, sales info

**Cannot edit** project information.

### Plot Availability (primary screen)

Per-project inventory:

```text
AVAILABLE / RESERVED / BOOKED / UNDER_DOCUMENTATION / SOLD / REGISTERED / RESALE_AVAILABLE / BLOCKED / CANCELLED
```

Interactive layout shows plot number, area, dimensions, facing, corner, road width, features, price, availability.

Filters: size bands, facing, corner / park facing / main road, price bands.

### Agent privacy rule (critical)

Agents may see the **status of every plot** (canonical model):

```text
A-101 AVAILABLE
A-102 RESERVED
A-103 BOOKED
A-104 UNDER_DOCUMENTATION
A-105 SOLD
A-106 REGISTERED
A-107 RESALE_AVAILABLE
A-108 BLOCKED
A-109 CANCELLED
```
```

They must **not** automatically see another agentÃ¢â‚¬â„¢s customer PII (name, mobile, payments, address) unless that customer is assigned to the logged-in agent.

### Leads

Only assigned or self-created leads.

Stages: New Ã¢â€ â€™ Contacted Ã¢â€ â€™ Qualified Ã¢â€ â€™ Site Visit Planned Ã¢â€ â€™ Site Visit Completed Ã¢â€ â€™ Interested Ã¢â€ â€™ Negotiation Ã¢â€ â€™ Reservation Ã¢â€ â€™ Booked Ã¢â€ â€™ Lost

### Customer onboarding

- Convert lead Ã¢â€ â€™ customer
- Create / update assigned customer profile, KYC, preferences, notes, documents
- **Cannot delete** customers
- Incorrect create Ã¢â€ â€™ Mark Duplicate / Request Correction Ã¢â€ â€™ Admin Review Ã¢â€ â€™ Merge / Archive

### Site Visits

Schedule visit; select customer + project + date/time; interested plots; notes; attended; outcome; follow-up.

### Reservations

Reserve available plot for own customer. View own active / expiring / converted / expired. **Cannot override** another agentÃ¢â‚¬â„¢s reservation.

### Bookings

Create for own customer / reservation / available plot. View own bookings. **Cannot delete** confirmed bookings. Cancellation = Agent requests Ã¢â€ â€™ Admin approves.

### Collections

View collections for own customers/bookings only. No accounting reconciliation (Finance owns that).

### Commissions

Own commission only. Admin controls commission rules.

### Project documents

Sales-approved documents only. Visibility levels:

```text
INTERNAL
AGENT_VISIBLE
CUSTOMER_PROFILE_RELATED
```

---

## 6. MAIN-customer Ã¢â‚¬â€ Customer App

Two purposes only:

1. **Explore** Ã¢â‚¬â€ discover Bhairava projects and plots  
2. **My Account** Ã¢â‚¬â€ own property and financial information only

### Navigation

```text
Home

EXPLORE
  Projects
  Plot Availability

MY ACCOUNT
  My Bookings
  My Properties
  Payments
  Payment Schedule
  My Documents
  Support

ACCOUNT
  Notifications
  Profile
```

**No:** admin functions, agent tools, project editing, project document vault, reports, other customers, company settings.

### Browse Projects

Active/public projects with overview, location, images, amenities, public pricing, plot categories, live availability, layout, marketing info.

### Plot Availability

Public plot facts for AVAILABLE and RESALE_AVAILABLE plots. RESERVED / BOOKED / UNDER_DOCUMENTATION / SOLD / REGISTERED show **status only** Ã¢â‚¬â€ never who.

### Customer privacy (strict)

**Visible:** plot number, area, dimensions, facing, corner, road, price, availability  

**Hidden:** other customer name/mobile/email, agent, booking price, payments, booking date, documents, ownership details of others

### My Bookings / Payments / Schedule

Own bookings and financials only.

### Documents (critical)

**Do not expose the project document repository to the Customer app.**

Customer has only **My Documents** tied to the logged-in customer and their booking/property (booking form, agreement, receipts, KYC, sale agreement, registration, NOC, sale deed).

### Support

Raise requests (payment receipt, document clarification, registration update, contact change, booking/payment question, other) with category, related property, message, attachment, status, reply history.

---

## 7. API permission model

One API; role-shaped responses.

Example: `GET /plots/:id`

| Role | Payload |
|------|---------|
| Admin | Complete internal record |
| Agent | Sales information; hide other agentsÃ¢â‚¬â„¢ customer PII |
| Customer | Public plot fields only |

Same pattern for `GET /projects` and related resources.

---

## 8. Implementation stance

- Prefer **copy / slim** from existing MAIN TanStack shell into `apps/admin`, `apps/agent`, `apps/customer` over greenfield rebuild.
- Existing Next portals and MAIN mock OS should **converge** under this architecture with one API ownership model.
- Do not invent a fourth product surface without updating this document.

---

## 9. Next steps after this doc

1. ~~Map MAIN Admin screen inventory~~ (done)  
2. ~~Lock Project Portfolio OS product calls~~ (done Ã¢â‚¬â€ see `2026-09-24-main-project-detail-portfolio-os.md`)  
3. ~~Permission matrix for `admin.projects.detail`~~ (done — `2026-09-24-main-project-detail-permission-matrix.md`)  
4. Implement P0Ã¢â‚¬â€œP1 (Overview + Setup) in MAIN  
5. Scaffold monorepo folders + shared packages when copy/slim begins  

---

*Locked by product decision 2026-09-24. Changes require an explicit architecture update, not silent UI drift.*

---

## 10. Project Portfolio OS locks (pointer)

Normative detail for MAIN Project Workspace lives in `2026-09-24-main-project-detail-portfolio-os.md`.

Locked there (do not diverge):

- Project create is lightweight `DRAFT` then configure in-workspace.
- Lifecycle: `DRAFT | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED`.
- `agentVisible` / `customerListed` are **publish flags**, not lifecycle statuses.
- Facing: North/South/East/West. Corner: NONE/NE/NW/SE/SW.
- Plot status (canonical): AVAILABLE → RESERVED → BOOKED → UNDER_DOCUMENTATION → SOLD → REGISTERED (+ RESALE_AVAILABLE, BLOCKED, CANCELLED; no HOLD).
- Plot types are templates; per-plot overrides need permission, reason, audit.
- Document vault: `INTERNAL | AGENT_VISIBLE | CUSTOMER_PROFILE_RELATED` Ã¢â‚¬â€ MAIN-customer never browses the project document repository.
- MAIN-agent: read assigned project sales data; cannot edit project master data.
- No hard-delete of project operational history after bookings/payments.
