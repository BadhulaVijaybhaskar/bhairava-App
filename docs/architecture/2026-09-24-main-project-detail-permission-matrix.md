# MAIN â€” Project Detail Permission Matrix

**Status:** LOCKED (2026-09-24)  
**Screen ID:** `admin.projects.detail` (also shapes MAIN-agent / MAIN-customer projections)  
**Companions:** `2026-09-24-bhairava-three-app-architecture.md`, `2026-09-24-main-project-detail-portfolio-os.md`

**Rule:** UI may hide controls; **authorization is enforced on the server** for every row below. Hiding a button is not permission.

---

## 1. Roles in scope

| Role | App | Scope |
|------|-----|-------|
| **Founder** | MAIN | Full company control; elevated / danger-zone |
| **Administrator** | MAIN | Full project ops except Founder-only billing/danger |
| **Finance** | MAIN | Money ops; Setup view-only; no master-data edit |
| **Viewer** | MAIN | Read-only across allowed MAIN surfaces |
| **Sales Agent** | MAIN-agent | Sell assigned/allowed projects; no project master-data edit |
| **Customer** | MAIN-customer | Explore public/listed + own booking/property only |

Single-company Bhairava today: billing/subscription permissions are **defined structurally** even if UI is deferred.

---

## 2. Capability verbs

| Verb | Meaning |
|------|---------|
| **FULL** | Create + edit + delete/archive where allowed + all views for that capability |
| **CREATE** | Create new records only |
| **EDIT** | Update existing records (not necessarily create/delete) |
| **VIEW** | Read all records in scope for the role on this project |
| **VIEW_ASSIGNED** | Read only records owned by / assigned to the actor |
| **VIEW_PUBLIC** | Read public-safe / listed fields only |
| **REQUEST** | Propose a change; another role must approve |
| **NONE** | No access (API returns 403 / omits fields) |

Record visibility and action permission are separate. Example: Agent may **VIEW** a booked plotâ€™s commercial status but have **NONE** on that bookingâ€™s customer PII.

---

## 3. Document visibility (aligned to Portfolio OS)

Vault labels (server enum):

| Code | Who may receive |
|------|-----------------|
| `INTERNAL` | MAIN Founder / Admin / (Finance if payment-related doc type) / Viewer if granted |
| `AGENT_VISIBLE` | Above + allowed Agents |
| `CUSTOMER_PROFILE_RELATED` | Not project-vault browse; entitled Customer via My Documents / booking only |

Marketing media for Explore uses Media + `customerListed`, not the document vault.

---

## 4. Project access prerequisite

Before any tab capability applies:

| Role | May open project workspace if |
|------|-------------------------------|
| Founder / Admin / Finance / Viewer | Any project in the company (Viewer: read policies) |
| Agent | `agentVisible` **and** (assigned to project **or** org all-agents policy) |
| Customer | `customerListed` **and** lifecycle allows browse (`ACTIVE`, or read-only browse rules for `ON_HOLD` if flagged) **or** customer has own booking/property on project (then My Account surfaces, not vault) |

---

## 5. Overview tab

| Capability | Founder | Admin | Finance | Viewer | Agent | Customer |
|------------|---------|-------|---------|--------|-------|----------|
| View inventory funnel / KPIs | VIEW | VIEW | VIEW | VIEW | VIEW (commercial counts only) | VIEW_PUBLIC (availability summary only) |
| View collections pulse | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED (own customersâ€™ aggregates) | VIEW_ASSIGNED (own balances only) |
| View sales pulse | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | NONE |
| View readiness checklist | VIEW | VIEW | VIEW | VIEW | NONE | NONE |
| View absorption chart | VIEW | VIEW | VIEW | VIEW | VIEW | VIEW_PUBLIC |
| Act on Overview CTAs | FULL | FULL | VIEW (deep-link Finance) | NONE | CREATE where sales-allowed | NONE |

**Sensitive fields on Overview:** pipeline value and overdue may be hidden from Customer; Agent sees commercial totals without other agentsâ€™ customer names.

---

## 6. Setup tab (project master data)

Founder/Admin own master-data editing. Finance = view-only. Agent/Customer = no Setup edit (Agent may see limited read-only marketing facts via Explore APIs, not Setup UI).

| Capability | Founder | Admin | Finance | Viewer | Agent | Customer |
|------------|---------|-------|---------|--------|-------|----------|
| View Setup tab | VIEW | VIEW | VIEW | VIEW | NONE (use agent project read APIs) | NONE (use public project APIs) |
| Edit project identity | EDIT | EDIT | NONE | NONE | NONE | NONE |
| Edit location | EDIT | EDIT | NONE | NONE | NONE | NONE |
| Change lifecycle status | FULL | FULL | NONE | NONE | NONE | NONE |
| Change `agentVisible` | FULL | FULL | NONE | NONE | NONE | NONE |
| Change `customerListed` | FULL | FULL | NONE | NONE | NONE | NONE |
| Create/edit phases | FULL | FULL | NONE | NONE | NONE | NONE |
| Create/edit blocks | FULL | FULL | NONE | NONE | NONE | NONE |
| Create/edit plot types | FULL | FULL | NONE | NONE | NONE | NONE |
| Create/edit pricing rules | FULL | FULL | NONE | NONE | NONE | NONE |
| Configure amenities | FULL | FULL | NONE | NONE | NONE | NONE |
| Manage media (marketing) | FULL | FULL | NONE | NONE | NONE | NONE |
| Configure project settings | FULL | FULL | NONE | NONE | NONE | NONE |
| Archive project (`ARCHIVED`) | FULL | FULL | NONE | NONE | NONE | NONE |
| Hard-delete project | NONE* | NONE | NONE | NONE | NONE | NONE |

\*Hard-delete forbidden after bookings/payments (Portfolio OS). Pre-operational empty DRAFT may allow Founder soft-purge only â€” treat as Founder elevated; default **NONE** for everyone once operational children exist.

Server enforces Active / publish readiness checklists on lifecycle and publish flag changes.

---

## 7. Layout & Plots tab

| Capability | Founder | Admin | Finance | Viewer | Agent | Customer |
|------------|---------|-------|---------|--------|-------|----------|
| View layout | VIEW | VIEW | VIEW | VIEW | VIEW | VIEW_PUBLIC |
| View plot inventory | VIEW | VIEW | VIEW | VIEW | VIEW | VIEW_PUBLIC |
| View plot price | VIEW | VIEW | VIEW | VIEW | VIEW | VIEW_PUBLIC (listed price only) |
| View plot availability / status | VIEW | VIEW | VIEW | VIEW | VIEW | VIEW_PUBLIC |
| Create plot | CREATE | CREATE | NONE | NONE | NONE | NONE |
| Edit plot master fields | EDIT | EDIT | NONE | NONE | NONE | NONE |
| Map polygon â†” plot | FULL | FULL | NONE | NONE | NONE | NONE |
| Change facing | EDIT | EDIT | NONE | NONE | NONE | NONE |
| Change area / dimensions | EDIT | EDIT | NONE | NONE | NONE | NONE |
| Change corner type | EDIT | EDIT | NONE | NONE | NONE | NONE |
| Change premium attributes | EDIT | EDIT | NONE | NONE | NONE | NONE |
| Change price (rule recalc / edit inputs) | EDIT | EDIT | NONE | NONE | NONE | NONE |
| Apply price override (reason + audit) | FULL | FULL | NONE | NONE | NONE | NONE |
| Change plot commercial status | FULL | FULL | NONE | NONE | REQUEST* | NONE |
| Block / unblock plot (`BLOCKED`) | FULL | FULL | NONE | NONE | NONE | NONE |
| View plot history | VIEW | VIEW | VIEW | VIEW | VIEW (status history only) | NONE |
| View linked customer on plot | VIEW | VIEW | VIEW (if payment-linked) | VIEW | VIEW_ASSIGNED only | VIEW_ASSIGNED (self only) |

\*Agent status changes that are part of reserve/book flows are **CREATE/EDIT on reservation/booking**, not free-form plot master status edits. Direct plot status edits = Admin/Founder (or REQUEST cancel flows).

**Plot status vocabulary (locked):** `AVAILABLE | RESERVED | BOOKED | UNDER_DOCUMENTATION | SOLD | REGISTERED | RESALE_AVAILABLE | BLOCKED | CANCELLED`. No `HOLD`. See Portfolio OS §13 for allowed transitions; exceptional transitions need reason + audit.

**Record-level:** Agent sees **all** commercial availability on allowed projects. Agent sees linked customer PII **only** if that customer is assigned/owned. Customer never sees other customersâ€™ identity, booking value, payments, or documents.

---

## 8. Sales tab

| Capability | Founder | Admin | Finance | Viewer | Agent | Customer |
|------------|---------|-------|---------|--------|-------|----------|
| **Leads** â€” view | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | NONE |
| **Leads** â€” create/edit | FULL | FULL | NONE | NONE | FULL (own/assigned) | NONE |
| **Leads** â€” delete | FULL | FULL | NONE | NONE | NONE | NONE |
| **Site visits** â€” view | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | NONE |
| **Site visits** â€” manage | FULL | FULL | NONE | NONE | FULL (own) | NONE |
| **Customers** â€” view | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED (self profile) |
| **Customers** â€” create | CREATE | CREATE | NONE | NONE | CREATE | NONE |
| **Customers** â€” edit | EDIT | EDIT | NONE | NONE | EDIT (assigned/created where allowed) | EDIT (own profile fields only) |
| **Customers** â€” delete | FULL | FULL | NONE | NONE | NONE | NONE |
| **Reservations** â€” view | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED (own) |
| **Reservations** â€” create/manage | FULL | FULL | NONE | NONE | FULL (own customers / available plots) | REQUEST (interest) / NONE for admin reserve |
| **Reservations** â€” modify othersâ€™ | FULL | FULL | NONE | NONE | NONE | NONE |
| **Bookings** â€” view | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED (own) |
| **Bookings** â€” create | FULL | FULL | NONE | NONE | CREATE (own) | NONE |
| **Bookings** â€” edit othersâ€™ | FULL | FULL | NONE | NONE | NONE | NONE |
| **Cancel reservation/booking** | FULL | FULL | NONE | NONE | REQUEST | REQUEST |

Customer â€œdeleteâ€ of own account is out of Project Sales scope (profile/settings elsewhere).

---

## 9. Finance tab

| Capability | Founder | Admin | Finance | Viewer | Agent | Customer |
|------------|---------|-------|---------|--------|-------|----------|
| View payment schedule | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED |
| View payment history | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED |
| Record payment | FULL | FULL | FULL | NONE | REQUEST / CREATE draft if policy allows* | NONE |
| Reconcile payment | FULL | EDIT | FULL | NONE | NONE | NONE |
| Reverse / adjust payment | FULL | FULL | FULL | NONE | NONE | NONE |
| Generate receipt | FULL | FULL | FULL | NONE | VIEW_ASSIGNED (download own customersâ€™) | VIEW_ASSIGNED (own) |
| View collections | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | NONE |
| View outstanding balance | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED |
| View commission | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED (own) | NONE |
| Modify commission rules / amounts | FULL | FULL | EDIT | NONE | NONE | NONE |

\*Default: Agents do **not** reconcile; they may record a collection intent / upload proof as **REQUEST** or restricted CREATE if company enables â€œagent collection captureâ€ â€” server flag; until enabled = **NONE** for record, **VIEW_ASSIGNED** for status.

Finance sees payment-related PII needed for reconciliation; **does not** gain Setup master-data EDIT.

---

## 10. Documents tab

| Capability | Founder | Admin | Finance | Viewer | Agent | Customer |
|------------|---------|-------|---------|--------|-------|----------|
| Browse project document vault | VIEW | VIEW | VIEW (payment-related types) | VIEW | VIEW (`AGENT_VISIBLE` only) | NONE |
| Upload INTERNAL | FULL | FULL | CREATE (finance docs) | NONE | NONE | NONE |
| Upload AGENT_VISIBLE | FULL | FULL | NONE | NONE | NONE | NONE |
| Upload / attach CUSTOMER_PROFILE_RELATED | FULL | FULL | CREATE (receipts etc.) | NONE | CREATE (for assigned customers) | CREATE (own support uploads) |
| View INTERNAL | VIEW | VIEW | VIEW (need-to-know) | VIEW | NONE | NONE |
| View AGENT_VISIBLE | VIEW | VIEW | VIEW | VIEW | VIEW | NONE |
| View CUSTOMER_PROFILE_RELATED | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED |
| Replace / version | FULL | FULL | EDIT (own finance docs) | NONE | NONE (project vault) | NONE |
| Delete / archive doc | FULL | FULL | EDIT (own uploads) | NONE | NONE | NONE |

Customers **never** get a project-document repository. Their files come only from profile / booking / property entitlement.

---

## 11. Team tab

| Capability | Founder | Admin | Finance | Viewer | Agent | Customer |
|------------|---------|-------|---------|--------|-------|----------|
| View assigned agents | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED (self)â€  | NONE |
| Assign agent | FULL | FULL | NONE | NONE | NONE | NONE |
| Remove agent | FULL | FULL | NONE | NONE | NONE | NONE |
| Configure all-agents access | FULL | FULL | NONE | NONE | NONE | NONE |
| View team performance | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED (own stats) | NONE |

â€ Broader team directory for Agents = **NONE** unless company setting `agentTeamVisible` is enabled (then VIEW roster without othersâ€™ customer PII).

---

## 12. Activity / Audit tab

| Capability | Founder | Admin | Finance | Viewer | Agent | Customer |
|------------|---------|-------|---------|--------|-------|----------|
| View general project activity | VIEW | VIEW | VIEW | VIEW | VIEW (non-sensitive sales events on assigned scope) | VIEW_ASSIGNED (own booking/payment events) |
| View sensitive audit trail | VIEW | VIEW | VIEW (finance events) | VIEW | NONE | NONE |
| View price override history | VIEW | VIEW | VIEW | VIEW | NONE | NONE |
| View plot status history | VIEW | VIEW | VIEW | VIEW | VIEW | NONE |
| View booking history (all) | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED |
| View payment history (all) | VIEW | VIEW | VIEW | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED |

Do not expose Setup diffs, price overrides, or other agentsâ€™ customer activity to Agents/Customers.

---

## 13. Founder-only / elevated controls

| Control | Founder | Admin | Others |
|---------|---------|-------|--------|
| Company billing / subscription | FULL (UI may be deferred) | NONE | NONE |
| Danger zone (destroy company data, transfer ownership) | FULL | NONE | NONE |
| Permanent hard-delete of operational history | NONE (forbidden by policy) | NONE | NONE |
| Restore `ARCHIVED` â†’ `COMPLETED` | FULL | REQUEST / NONE (default Founder) | NONE |
| Bypass publish readiness (emergency) | FULL + audit | NONE | NONE |
| Grant/revoke Admin role | FULL | NONE | NONE |

Structurally define billing permissions now; ship UI later for single-company Bhairava.

---

## 14. Record-level visibility rules

1. **Agent â†’ leads/customers:** only owned or assigned (and self-created where policy allows).  
2. **Agent â†’ plots:** all commercial availability on allowed projects; **no** unrelated customer PII.  
3. **Agent â†’ reservations/bookings:** own only; cannot mutate peersâ€™.  
4. **Customer â†’ projects/plots:** public/listed fields only in Explore.  
5. **Customer â†’ bookings/payments/documents:** own records only.  
6. **Customer â†’ other buyers:** never identity, booking value, payments, documents.  
7. **Finance â†’ PII:** payment/reconciliation need-to-know; no Setup EDIT.  
8. **Viewer:** read-only; no mutate; no danger-zone.  
9. **Publish flags / lifecycle:** server rejects illegal combinations (e.g. `DRAFT` + `customerListed`).

---

## 15. Sensitive-field rules (examples)

| Field / group | Founder/Admin | Finance | Viewer | Agent | Customer |
|---------------|---------------|---------|--------|-------|----------|
| Plot status, area, facing, listed price | Y | Y | Y | Y | Y if public/listed |
| Manual price override amount + reason | Y | Y | Y | N | N |
| Other customer name/phone/KYC | Y | Need-to-know | Y | Assigned only | Self only |
| Booking value / payment schedule | Y | Y | Y | Assigned | Own |
| INTERNAL documents | Y | Limited | Y | N | N |
| RERA / legal vault docs | Y | Limited | Y | If AGENT_VISIBLE | N (unless profile-related entitlement) |
| Agent commission rates (others) | Y | Y | Y | Own only | N |

API responses must **omit** fields (not only blank UI).

---

## 16. Approval / request workflows

| Action | Requester | Approver | Notes |
|--------|-----------|----------|-------|
| Cancel reservation | Agent / Customer | Admin / Founder | Agent cannot cancel peersâ€™ |
| Cancel confirmed booking | Agent / Customer | Admin / Founder | No silent delete |
| Customer correction / merge | Agent | Admin | Duplicate handling |
| Agent collection capture (if enabled) | Agent | Finance reconcile | Until enabled: no capture |
| Restore archived project | Admin (optional REQUEST) | Founder | Default Founder-only |
| Emergency publish bypass | â€” | Founder | Always audited |

---

## 17. Backend authorization implications

- Enforce every cell via API/policy middleware; never UI-only.  
- Authorize **project access** then **tab action** then **row scope** then **field projection**.  
- Publish/lifecycle transitions run readiness validators server-side.  
- Price override requires permission + reason + audit row.  
- Document downloads check visibility enum + entitlement FKs.  
- Agent â€œall plots status / no PIIâ€ is a **projection rule**, not a second inventory.  
- Customer Explore and My Account are different query paths (listed public vs owned).  
- Log sensitive denials optionally for Admin security review (not shown to Agents).

---

## 18. Role Ã— tab quick matrix (summary)

| Tab | Founder | Admin | Finance | Viewer | Agent | Customer |
|-----|---------|-------|---------|--------|-------|----------|
| Overview | FULL | FULL | VIEW | VIEW | VIEW / VIEW_ASSIGNED | VIEW_PUBLIC / own |
| Setup | FULL | FULL | VIEW | VIEW | NONE | NONE |
| Layout & Plots | FULL | FULL | VIEW | VIEW | VIEW (+ sales actions elsewhere) | VIEW_PUBLIC |
| Sales | FULL | FULL | VIEW | VIEW | VIEW_ASSIGNED + CREATE/EDIT own | own / REQUEST |
| Finance | FULL | FULL | FULL | VIEW | VIEW_ASSIGNED | VIEW_ASSIGNED |
| Documents | FULL | FULL | limited FULL/VIEW | VIEW | AGENT_VISIBLE + assigned profile docs | profile-related only |
| Team | FULL | FULL | VIEW | VIEW | self (â€ ) | NONE |
| Activity | FULL | FULL | VIEW (+ finance) | VIEW | limited assigned | own events |

---

## 19. Remaining blockers

**None** for starting P0â€“P1 (Overview + Setup shells with readiness UI and Setup edit gated to Founder/Admin).

Deferred (non-blocking): billing UI, org all-agents UX polish, jurisdiction RERA profile data, agentTeamVisible setting default.

---

## 20. Implementation gate

| Gate | Status |
|------|--------|
| Portfolio OS product locks | Done |
| Permission matrix | **Done (this doc)** |
| P0â€“P1 MAIN implementation | **May start immediately** |

P0â€“P1 must respect: Setup EDIT = Founder/Admin only; Finance/Viewer Setup VIEW; publish/lifecycle controls Founder/Admin; no Agent/Customer Setup.

---

*Locked 2026-09-24. Changes require explicit architecture update.*