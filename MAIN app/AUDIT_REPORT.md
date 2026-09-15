# Bhairava MAIN — Functional + UX + Data-Integrity Audit Report

Date: 2026-09-15  
Scope: `MAIN app/` only (TanStack Start / Vite / React / Capacitor shell)

## Summary

Members/roles, audit log, company settings, and multiple dead interactive controls were wired into the central localStorage-backed store (`bhairava.admin.v4`). Role/permission helpers are centralized. Vitest unit tests cover permissions, invite validation, and company defaults. `npm run typecheck`, `npm test`, and `npm run build` pass.

---

## Issues found and fixed

### CRITICAL

| Route / File | Problem | Root cause | Fix | How verified |
|---|---|---|---|---|
| `/settings/users` · `settings.users.tsx` | Three-dot menu, role button, invite had no handlers; members came from immutable mock | Direct `appUsers` import; no store APIs | Moved members into store (`workspaceUsers` + invite/role/status/remove); real dropdown + role dialog + invite validation + confirmations + toasts + audit | Typecheck; unit tests for invite/founder rules; code path review |
| `/settings/users` | Could remove/demote final Founder or self | No protection logic | `permissions.ts` + store guards; UI disables with reason | Unit tests `canRemoveMember` / `canDemoteFounder` |
| `/settings/audit` · `settings.audit.tsx` | Audit page was static mock; Export dead | Imported `auditLog` mock | Mutable `auditEntries` + `logAudit`; page reads store; Export downloads CSV | Typecheck; Export handler calls `downloadCsv` |
| `/settings/company` · `settings.company.tsx` | Save / Delete Workspace visual-only | Uncontrolled fields, no persist | Controlled draft from `companySettings`; Save persists + audit; Delete requires typing `DELETE` then resets workspace | Typecheck; handlers review |

### HIGH

| Route / File | Problem | Root cause | Fix | How verified |
|---|---|---|---|---|
| Store architecture | Operational entities mixed mock + store | Pages imported mock arrays for CRUD | Store extended: users, audit, company, documents, payments, registrations, notifications; mutations append audit | Build + typecheck |
| `/documents` | Upload dead; verification cosmetic | Mock-only docs | Store docs; file upload; verify/reject menu; CSV export | Typecheck |
| `/payments/$paymentId` | Refund / Resend receipt dead | No handlers | Refund updates payment status (permission-gated); resend logs audit + toast | Typecheck |
| `/receipts/$paymentId` | Print / Download dead | No handlers | `window.print`; HTML download; uses company settings branding | Typecheck |
| `/plots/layout` | Reserve / Book / Open record dead | Buttons without links | Linked to onboarding reservation/booking + plots list | Typecheck |
| `/registrations` | Stages immutable | Mock array | Store registrations; stage change via menu + audit | Typecheck |
| Cross-module booking → payment | Booking with advance did not create payment | Onboarding only saved booking | `onboarding.booking` also `savePayment` when paid > 0 | Code review |

### MEDIUM

| Route / File | Problem | Root cause | Fix | How verified |
|---|---|---|---|---|
| `FilterBar` Export/Filters | Looked interactive, often no-ops | Missing handlers | Optional `onExport`/`onFilters`; default toast guidance; wired on payments/documents | Code review |
| `/notifications` + app shell badge | Mark-read was local state only | Component-local copy of mock | Persist via store; TopBar unread from store | Typecheck |
| `/reports/collections` | Download report dead | No handler | CSV export of filtered payments | Typecheck |
| Reports / schedule / resale / dashboard / collections | Still reading mock for some lists | Incomplete migration | Migrated primary lists to `useData()` | Typecheck + build |
| Auth session role | Demo session was Administrator while UI Founder is Vijay | `DEMO_ADMIN.role` | Set role to `Founder`; `currentUser` resolves by name/email/fallback | Code review |

### LOW

| Route / File | Problem | Root cause | Fix | How verified |
|---|---|---|---|---|
| `Btn` | Could not disable | No `disabled` prop | Added `disabled` / `title` / `type` | Typecheck |
| Lint suite | Many pre-existing Prettier violations across untouched routes | Historical formatting | Formatted changed files; full `eslint .` still reports legacy issues elsewhere | `prettier --write` on touched files |

---

## Files changed (primary)

- `src/lib/store.tsx` — central persistence v4 + member/audit/company/docs/payments/regs/notifications + audit on mutations
- `src/lib/permissions.ts` (+ tests)
- `src/lib/company.ts`, `src/lib/csv.ts` (+ test)
- `src/lib/auth.ts` — Founder session role
- `src/routes/settings.users.tsx`, `settings.audit.tsx`, `settings.company.tsx`
- `src/routes/documents.tsx`, `notifications.tsx`, `payments.*`, `receipts.*`, `registrations.tsx`, `plots.layout.tsx`
- `src/routes/index.tsx`, `collections.tsx`, `schedule.tsx`, `resale.tsx`, `reports.collections.tsx`, `agents.index.tsx`, `onboarding.booking.tsx`, `bookings.$bookingId.tsx`, `projects.$projectId.tsx`
- `src/components/kit.tsx`, `app-shell.tsx`, `booking-card.tsx`
- `vitest.config.ts`, `package.json` scripts (`test`, `typecheck`)

---

## Functional fixes

- Invite / change role / suspend / reactivate / remove / resend / revoke invitation
- Founder self-protection and final-Founder protection
- Live audit trail + CSV export
- Company save + destructive workspace reset with confirmation text
- Document upload + verification status changes
- Payment refund + receipt resend/print/download
- Registration stage moves
- Booking creates linked payment when advance > 0

## UX fixes

- Real menus/dialogs/confirmations (no deceptive three-dots)
- Toasts on success/error
- Permission-disabled controls with explanations
- Mobile bottom nav / FAB / dashboard shortcuts preserved (no redesign)

## Remaining mock-only limitations

- No real backend/auth — localStorage only (`bhairava.admin.v4`)
- Derived charts (`cashflow`, `salesTrend`) remain seed mock series
- Some report screens still compute from store + mock trend data
- Seed plot deletion still uses overlay extras pattern (seed plots remain via merge)
- Receipt “PDF” downloads as printable HTML (no PDF engine)
- Playwright E2E not added (Vitest unit coverage for permissions/invite/company); install Playwright in a follow-up if needed
- Full-repo `eslint .` still fails on pre-existing Prettier debt outside this change set

## Test results

```
npm run typecheck  → pass
npm test           → 9 passed (permissions, invite validation, company defaults, csv helper)
npm run build      → pass
```

## Routes verified (static + build)

Settings users/audit/company; documents; notifications; payments list/detail; receipts; registrations; plots layout; dashboard; collections; schedule; resale; reports/collections; booking onboarding payment side-effect. Manual browser E2E not run in this environment for every route; logic covered by store APIs + unit tests + production build.
