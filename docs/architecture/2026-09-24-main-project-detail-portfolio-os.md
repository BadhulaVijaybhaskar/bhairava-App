# MAIN â€” Project Detail as Portfolio OS

**Status:** LOCKED decisions + screen map (2026-09-24)  
**Screen ID:** `admin.projects.detail`  
**Route today:** `/projects/$projectId`  
**Companions:** `2026-09-24-bhairava-three-app-architecture.md`, `2026-09-24-main-admin-screen-inventory.md`

**Rule:** Product decisions in Â§10â€“Â§16 are locked. Implement permission matrix next, then P0â€“P1. Do not reopen locked items without an explicit architecture change.

---

## 1. Product intent

Project detail is not a CRM record page. It is the **operating system for one plotted development**: configure the product, run inventory, drive sales, collect money, hold documents, and see health â€” without leaving the project.

**One-liner:** Open a project â†’ run that project.

**Creation stance (locked):** Project creation is **lightweight**. Capture basic identity â†’ **save as `DRAFT`** â†’ continue all further configuration inside this Project Workspace (not a long blocking create wizard).

---

## 2. What exists today (baseline)

Current tabs: **Overview Â· Plots Â· Customers Â· Bookings Â· Documents**

| Area | Today | Gap vs Portfolio OS |
|------|-------|---------------------|
| Header | Code, name, location, status, approvals, plot/sold/value facts; Edit / Add plot / Site visit / Live layout | Missing phase/block summary, agent assignees, lifecycle vs publish controls |
| Overview | Absorption chart + activity timeline | Thin: no inventory funnel, collections pulse, readiness checklist, amenity/pricing snapshot |
| Plots | Table (number, area, facing, price, status) + links | No filters, bulk status, corner/road/premium columns, block/phase grouping, polygonâ†’plot link |
| Customers | Table of customers who hold plots | No leads for this project, no agent filter |
| Bookings | Table | No reservations / site visits scoped to project |
| Documents | Flat table | Visibility model not applied; no master-layout slot; no upload |
| Config | `ProjectEditor` + create wizard fields | Phases, blocks, plot types, amenities richness, pricing rules, media not first-class |
| Sales ops | Global only | No project-scoped visits / reservations / collections / agents |

`project-config.ts` already defines facings, corner types, plot features, amenities catalog, and default pricing rules â€” promote into Setup rather than inventing a parallel model. **Canonical enums below supersede mock spelling where they differ** (migrate mock â†’ locked codes at implementation).

---

## 3. Target information architecture (locked)

### Header (always on)

- Identity: name, code, type, **lifecycle status**, location line  
- **Publish flags** (separate from lifecycle): Agent-visible Â· Customer-listed  
- Compliance chips: RERA / approvals (when present)  
- KPI strip: Total / Available / Reserved / Booked / Under documentation / Sold / Registered / Resale / Blocked Â· Absorption % Â· Pipeline value Â· Collected Â· Overdue  
- Primary actions: Edit basics Â· Add plots Â· Open layout Â· Upload master plan  
- Secondary: Assign agents Â· Change lifecycle Â· Site visit Â· New reservation Â· New booking  
- Readiness indicator when `DRAFT` or when publish is blocked

### Tabs (locked)

```text
Overview
Setup
Layout & Plots
Sales
Finance
Documents
Team
Activity
```

URL: `/projects/$projectId?tab=` (stable deep links).

---

## 4. Tab specs

### 4.1 Overview â€” project health

1. **Inventory funnel** â€” counts + % per plot commercial status  
2. **Collections pulse** â€” collected vs due, overdue, last payments  
3. **Sales pulse** â€” visits / reservations / bookings; top agents on this project  
4. **Readiness / setup completeness** â€” mirrors Draftâ†’Active / publish checklist (Â§12)  
5. **Recent activity** â€” project-scoped audit  
6. **Absorption chart** â€” keep; prefer real transitions later  

### 4.2 Setup â€” product definition (admin depth)

| Sub-section | Content |
|-------------|---------|
| **Identity** | Name, code, type, description, manager |
| **Location** | Address, village, mandal, district, city, state, pincode, map pin |
| **Legal & approvals** | RERA (when applicable), approval authority, legal notes, approval chips |
| **Phases** | CRUD phases (name, order, status, dates) |
| **Blocks / sectors** | CRUD blocks tied to phase |
| **Plot types** | Reusable templates (defaults for area, dimensions, facing, premiums) â€” see Â§13 |
| **Pricing rules** | Base rate + configurable premiums â€” see Â§14 |
| **Amenities** | Catalog items with description, development status, completion %, media, visibility â€” see Â§10 |
| **Media** | Hero, gallery, brochure (marketing; not the document vault) |
| **Publish** | Agent-visible / Customer-listed flags + readiness gates |

Destructive Setup changes: confirm + audit. **No hard-delete of operational history** once bookings/payments exist (Â§16).

### 4.3 Layout & Plots â€” inventory OS

- Interactive layout polygons **link 1:1 to plot records** (locked).  
- Inventory table: Plot # Â· Phase Â· Block Â· Type Â· Area Â· Dimensions Â· Facing Â· Corner Â· Road Â· Features Â· Price Â· Status Â· Customer (admin PII) Â· Agent Â· Override badge  
- Add plot; bulk legal status transitions; recalculate price from rules; open layout editor  
- Per-plot overrides of template fields where permitted (Â§13â€“Â§14)

### 4.4 Sales â€” project-scoped pipeline

Leads (slot) Â· Site visits Â· Reservations Â· Bookings Â· Customers â€” create actions pass `projectId`.

**Resale (locked):** stays a **global** ops screen with project filter; Overview shows count + deep link only (no second resale engine inside Project OS).

### 4.5 Finance â€” money for this project

Summary, payments, schedules, receipts shortcuts, commissions placeholder. Deep-link to global finance records.

**Role (locked):** Finance role may use Finance (+ read Overview/Sales/Documents as permitted) but **Setup is Founder/Admin edit**; Finance gets **view-only Setup** if needed for context.

### 4.6 Documents â€” vault with visibility

See Â§15. Special slots: Master layout Â· Brochure (file) Â· Approval docs.  
**MAIN-customer never browses this repository.**

### 4.7 Team

Assign / unassign agents permitted to sell this project; mini performance on this project.

### 4.8 Activity

Filterable audit: config, plot status, pricing overrides, bookings, payments, documents, lifecycle, publish toggles.

---

## 5. Mapping from platform architecture

| Architecture capability | Lands in |
|-------------------------|----------|
| Create / edit projects | Lightweight create â†’ DRAFT; Header + Setup |
| Phases, blocks, plot types, dimensions, facing, corner, roads | Setup + Layout & Plots |
| Premium features, price rules, amenities | Setup |
| Upload images, documents, master layout | Setup â†’ Media + Documents |
| Map plots; create/edit plots; change status | Layout & Plots |
| Assign agents | Team |
| Customers, bookings, payments, registration, resale | Sales + Finance + global ops links |

---

## 6. Cross-app visibility (locked summary)

| Audience | Sees from a project |
|----------|---------------------|
| **MAIN** | Full Portfolio OS per permissions |
| **MAIN-agent** | Assigned/allowed projects: details, layout, plot availability, pricing, **AGENT_VISIBLE** documents. **Cannot** modify project master data (Setup, plot types, pricing rules, lifecycle, publish). |
| **MAIN-customer** | Public/listed projects & plot availability only. **No** project document repository. **No** other customersâ€™ PII on reserved/booked/sold plots. Own booking/property docs only via **My Documents** / profile-related attachments. |

---

## 7. Implementation stance

1. Deepen `/projects/$projectId` â€” no greenfield route.  
2. Promote `project-config.ts` + onboarding fields; migrate enums to locked codes.  
3. `?tab=` for v1.  
4. Layout: deep-link first OK; polygons must resolve to plot IDs before Customer-listed publish.  
5. Leads / Commissions segments may empty-state until those Admin screens exist.

---

## 8. Build slices

| Slice | Outcome |
|-------|---------|
| **P0** | Tab IA + Overview health + readiness checklist UI |
| **P1** | Setup: Identity / Location / Legal / Amenities / Pricing rules |
| **P2** | Layout & Plots: columns, filters, polygonâ†”plot, overrides |
| **P3** | Documents visibility + master layout slot |
| **P4** | Sales segments scoped |
| **P5** | Finance summary + Team + Activity |
| **P6** | Phases / blocks / plot types CRUD + publish gates enforced in API |

---

## 9. Architecture capability map (unchanged intent)

Registration & resale remain global with project filter; Project OS shows counts + links.

---

# LOCKED PRODUCT DECISIONS

## 10. Amenities (locked)

Each project amenity record supports:

- Catalog reference / name  
- Description  
- Development status (e.g. Planned / In progress / Completed â€” align with existing amenity status vocabulary)  
- Completion %  
- Media (optional images)  
- Visibility (internal marketing vs agent vs customer-listed marketing surface)

**Activation:** Amenities are **optional** for `DRAFT â†’ ACTIVE` (warning if none).  
**Customer-listed publish:** at least marketing copy or media for listed amenities is a **warning**, not a hard error.

---

## 11. Project lifecycle vs publish (locked)

### Lifecycle status (exactly one)

| Status | Meaning |
|--------|---------|
| `DRAFT` | Created; incomplete; not sold against; workspace setup in progress |
| `ACTIVE` | Operational project; inventory/sales/finance allowed per readiness |
| `ON_HOLD` | Temporarily paused (sales actions restricted; data retained) |
| `COMPLETED` | Project commercially finished; read-heavy; limited edits |
| `ARCHIVED` | Terminal soft-end; hidden from default lists; **no hard-delete** of history |

### Publish / visibility flags (orthogonal to lifecycle)

| Flag | Meaning |
|------|---------|
| `agentVisible` | Project appears for assigned/allowed agents in MAIN-agent |
| `customerListed` | Project appears in MAIN-customer Explore |

**`PUBLISHED` is not a lifecycle status.** â€œPublishedâ€ means the relevant visibility flag(s) are on **and** readiness gates for that surface pass.

Allowed combinations (normative):

- `DRAFT` â†’ both flags **must be off** (API-enforced).  
- `ACTIVE` â†’ flags optional, each gated by checklist (Â§12).  
- `ON_HOLD` â†’ flags may remain on for read-only browse, but new reservations/bookings blocked (API).  
- `COMPLETED` / `ARCHIVED` â†’ `customerListed` off by default; agent read may remain for history if `agentVisible`.

Transitions (high level):

```text
DRAFT â†’ ACTIVE          (readiness: Active checklist)
ACTIVE â†” ON_HOLD
ACTIVE â†’ COMPLETED
ON_HOLD â†’ ACTIVE | COMPLETED
COMPLETED â†’ ARCHIVED
ARCHIVED â†’ (no automatic reopen; Founder restore to COMPLETED only)
```

Never: hard-delete project with bookings/payments; use `ARCHIVED`.

---

## 12. Draft â†’ Active / publish readiness (locked)

### 12.1 Minimum to leave `DRAFT` â†’ `ACTIVE` (errors block)

| # | Requirement | Severity |
|---|-------------|----------|
| A1 | Name, code, project type | Error |
| A2 | Location: city, state, pincode (or equivalent mandal/district + pincode if rural form used) | Error |
| A3 | â‰¥1 plot inventory record on the project | Error |
| A4 | Every plot has valid price (> 0) **or** resolvable price from rules + type (no null/zero sale price) | Error |
| A5 | Lifecycle set explicitly to ACTIVE by permitted role | Error |

### 12.2 Warnings on `DRAFT â†’ ACTIVE` (do not block)

| # | Item | Severity |
|---|------|----------|
| W1 | No interactive layout / polygons yet | Warning â€” layout may be added later |
| W2 | No amenities configured | Warning |
| W3 | No agents assigned | Warning â€” sales availability weak |
| W4 | RERA / statutory fields empty | Warning **unless** jurisdiction profile marks RERA mandatory â†’ then **Error** |
| W5 | No hero/brochure media | Warning |
| W6 | Pricing rules missing (plots may use only manual prices) | Warning |

### 12.3 `agentVisible = true` (errors block)

| # | Requirement | Severity |
|---|-------------|----------|
| G1 | Lifecycle is `ACTIVE` (not `DRAFT`) | Error |
| G2 | Active checklist A1â€“A4 satisfied | Error |
| G3 | â‰¥1 agent assigned **or** org-level â€œall agentsâ€ policy enabled | Error |
| G4 | Agent-facing marketing basics: name, location, â‰¥1 available or shown plot | Error |

### 12.4 `customerListed = true` (errors block)

| # | Requirement | Severity |
|---|-------------|----------|
| C1 | Lifecycle is `ACTIVE` | Error |
| C2 | Active checklist A1â€“A4 satisfied | Error |
| C3 | Customer-visible project info: name, location, public description or media | Error |
| C4 | Layout: interactive layout **or** static master-layout document in Documents with visibility suitable for marketing mirror â€” **at least one** required | Error |
| C5 | No customer-listed publish while any plot lacks public-safe fields (number, area, availability, price) | Error |
| C6 | RERA/legal: same as W4 rule (mandatory only when applicable) | Error if mandatory; else Warning |

**Layout policy (locked):** Layout may be added **after** Active (warning W1). Layout (interactive **or** master-layout file) is **required before Customer-listed**.

---

## 13. Plot types, facing, corner, overrides (locked)

### Plot types

- Reusable **templates** on the project (and later org library if needed).  
- Defaults: area, dimensions, facing, corner, road width, premium attributes, base price contribution.  
- **Each plot** may override: area, dimensions, facing, corner, road width, premium attributes, price â€” subject to permission.

### Facing (canonical)

```text
North | South | East | West
```

(UI may show N/S/E/W; store full tokens.)

### Corner (canonical)

```text
NONE | NE | NW | SE | SW
```

Legacy mock labels (`Not corner`, `North-East`, â€¦) map into these codes at migration.

### Plot commercial status (canonical — LOCKED)

Do **not** use `HOLD` as a plot status. `BLOCKED` is the administrative unavailable state.

**Canonical statuses:**

```text
AVAILABLE
RESERVED
BOOKED
UNDER_DOCUMENTATION
SOLD
REGISTERED
RESALE_AVAILABLE
BLOCKED
CANCELLED
```

**Normal lifecycle:**

```text
AVAILABLE → RESERVED → BOOKED → UNDER_DOCUMENTATION → SOLD → REGISTERED
```

**Additional allowed transitions:**

```text
AVAILABLE → BLOCKED
BLOCKED → AVAILABLE
RESERVED → AVAILABLE
RESERVED → CANCELLED
RESERVED → BOOKED
BOOKED → UNDER_DOCUMENTATION
BOOKED → CANCELLED
UNDER_DOCUMENTATION → BOOKED
UNDER_DOCUMENTATION → SOLD
UNDER_DOCUMENTATION → CANCELLED
CANCELLED → AVAILABLE
SOLD → REGISTERED
SOLD → RESALE_AVAILABLE
REGISTERED → RESALE_AVAILABLE
RESALE_AVAILABLE → RESERVED
RESALE_AVAILABLE → BLOCKED
```

**Rules:**

- Preserve full plot-status history (who, when, from, to).
- Exceptional/manual transitions (anything outside the automatic reserve/book/register happy path driven by sales documents) require **reason + audit**.
- Agents do not free-form edit status; reserve/book flows create/update sales records that drive allowed transitions server-side.
- Overview inventory funnel and KPIs must count **all** canonical statuses (not a shortened Available/Reserved/Booked/Registered set).

---

## 14. Pricing override rules (locked)

1. **Default price** = project pricing rules applied to plot (base rate Ã— area + facing/corner/road/feature premiums from rules).  
2. Plot type defaults seed attributes before rules run.  
3. **Plot-specific price override** allowed only if actor has permission `projects.plots.price_override` (Founder/Admin by default; not agents).  
4. Override **requires**: new value, **reason** (non-empty), and writes **audit history** (who, when, before, after, reason).  
5. Attribute overrides that change premium inputs (facing, corner, etc.) recalculate rule price unless a hard price override is active; if hard override active, show badge â€œManual priceâ€ and do not silently overwrite.  
6. Clearing a manual override recalculates from rules and audits.  
7. MAIN-agent sees final sellable price; cannot set overrides.  
8. MAIN-customer sees public price only on allowed plots.

---

## 15. Document visibility rules (locked)

Project Documents vault visibility:

| Value | Who |
|-------|-----|
| `INTERNAL` | MAIN roles with documents permission only |
| `AGENT_VISIBLE` | MAIN + allowed MAIN-agent users |
| `CUSTOMER_PROFILE_RELATED` | Not a browseable vault item for Explore. Attached into a **customer/booking/property** document flow; customer sees it under **My Documents** when entitled |

**Rules:**

- Do **not** expose the general Project Documents repository in MAIN-customer.  
- Public marketing files (brochure PDF mirrored to Media, public images) use **Media / customerListed**, not vault browsing.  
- Prefer `INTERNAL` default on upload.  
- Master layout file may be `INTERNAL` or `AGENT_VISIBLE`; customer-facing map uses layout engine / marketing mirror under publish gates, not vault listing.  
- Rename path from older draft labels `ADMIN_ONLY` / `CUSTOMER_VISIBLE` â†’ this model (`CUSTOMER_VISIBLE` as vault browse is **rejected**).

---

## 16. Retention & delete (locked)

- Once any **booking or payment** exists on a project, **hard-delete is forbidden**.  
- Use `ARCHIVED` (and soft-hide).  
- Plot/document deletes that would erase operational history are blocked; archive/hide instead.  
- Audit log retained per company retention policy (Founder settings later).

---

## 17. Resolved former open calls

| Former open call | Resolution |
|------------------|------------|
| Plot status enum | §13 canonical nine-status model (no HOLD) |
| Resale in-project vs global | Global + Overview count |
| Finance vs Setup edit | Setup edit = Founder/Admin; Finance view-only on Setup |
| Lifecycle vs Published | Â§11 orthogonal flags |
| Layout before Active? | Optional for Active; required for Customer-listed |
| Amenities required? | Optional (warning) |
| Facing / corner | Â§13 |
| Doc visibility | Â§15 |

---

## 18. Remaining blocking calls

**None for permission matrix or P0â€“P1.**

Non-blocking follow-ups (do not stop P0â€“P1):

1. Exact org-level â€œall agents can sellâ€ policy UX.  
2. Jurisdiction profile for mandatory RERA (data: company/project regulatory profile).  
3. Whether plot type library is project-only in v1 or also org-scoped (v1 = project-scoped templates).  
4. Mock status vocabulary migration to canonical nine-status model during data model PR.

---

## 19. Database implications (for later model PR)

| Area | Implication |
|------|-------------|
| `projects` | `lifecycleStatus`, `agentVisible`, `customerListed`; soft `archivedAt`; no hard delete with operational children |
| `project_amenities` | description, developmentStatus, completionPct, media refs, visibility |
| `plot_types` | template table FK project (v1) |
| `plot_status_history` | fromStatus, toStatus, reason, actorId, createdAt; append-only |
| `plots` | FK type; override columns; `priceOverride`, `priceOverrideReason`; facing/corner enums; polygon/geometry FK to layout feature id |
| `pricing_rules` | JSON/table per project; audit on change |
| `plot_price_override_audit` | history rows |
| `documents` | `visibility` enum INTERNAL \| AGENT_VISIBLE \| CUSTOMER_PROFILE_RELATED; optional `customerId`/`bookingId` when profile-related |
| `layout_features` | polygon â†” `plotId` required before customer list gate |
| `project_agents` | assignment table for Team + agentVisible gate |

API must enforce readiness checklists and agent master-data deny rules server-side.

---

## 20. Readiness for next steps

| Step | Ready? |
|------|--------|
| Permission matrix for `admin.projects.detail` | **Done** — see companion matrix doc |
| P0â€“P1 implementation (Overview + Setup) | **Yes** â€” after permission matrix (recommended order) |
| App code in this change | **No** â€” docs only |

---

*Locked 2026-09-24. Changes require an explicit architecture update.*