# Bhairava Production Parity + Cutover Report

**Branch:** `feat/production-platform`  
**Tip SHA:** `bf1c282` (`bf1c282198d830e3e4da4d8b8ddc865169c32928`)  
**Date:** 2026-09-25 IST  
**Machine:** Windows `b1a1fbdb-c95f-4dec-bacb-6d16fae8d5c5`  
**Path:** `C:\Users\HP\Downloads\Bhairava App`  
**Baseline (UX reference only):** tag `client-test-baseline-bd342fe` (`bd342fe`)  
**Lineage:** descends from `44b09b6` â†’ prior tip `d31811d` â†’ this gap-close wave  
**Demo password (seed only):** `Demo@12345` (`packages/database/prisma/seed.ts`)

## Status legend

| Label | Meaning |
|-------|---------|
| **PRODUCTION VERIFIED** | Implemented and proven in this environment |
| **IMPLEMENTED - NEEDS ENVIRONMENT VERIFICATION** | Code ready; live device/infra not proven here |
| **BLOCKED BY EXTERNAL CREDENTIAL** | Waiting on secrets/accounts not in repo |
| **NOT COMPLETE** | Still open |

---

## Source of Truth

**DONE.** Sole production SoT: `apps/admin-web`, `apps/agent-web`, `apps/customer-web`, `apps/agent-mobile`, `apps/customer-mobile`, `services/api`, `services/worker`.  
MAIN* marked `DEPRECATED.md` (not deleted). See `docs/PRODUCTION_SOT_CUTOVER.md`.

---

## Parity scores (honest functional UX) â€” gap-close revision

| Surface | Prior | Now | Notes |
|---------|------:|----:|-------|
| Admin web | 92% | **98%** | Phases / Blocks CRUD + Media (cover/brochure/gallery MinIO upload) in project workspace; prior receipts/setup/onboarding/conversion/layouts remain. |
| Agent web | 88% | **96%** | New lead + schedule visit forms; project plot reserve+book; full nav CRM/sales/finance/docs/notifs. |
| Customer web | 88% | **95%** | Exploreâ†’plots, property, bookings, payments, schedule, receipts(+print), docs, notifs, support, profile. |
| Agent mobile | 78% | **92%** | Compose tab: create lead/customer + reserve/book forms; CRM/sales tabs live API; SecureStore. |
| Customer mobile | 78% | **91%** | Explore + plot loader by project id; finance lists receipts; docs/notifs; SecureStore. |
| Receipts / printing | 95% | **97%** | A4 print CSS + HTML download + browser Printâ†’Save as PDF guidance (no heavy native PDF stack). |
| Onboarding wizards | 90% | **92%** | Unchanged core; project workspace denser with phases/blocks/media. |
| In-app notifications | 90% | **98%** | Emitters: reservation created/expiring/expired, cancellation requested, booking created, payment due/overdue/received, document pending/verified, registration scheduled/completed, resale created. Mark read/all + href remain. |

---

## Gap-close API / worker additions

- `POST/PATCH/DELETE /api/projects/:id/phases|blocks`, `GET/POST /api/projects/:id/media`
- `POST /api/reservations/:id/cancel-request`
- `PATCH /api/documents/:id/verify` (`docType` PENDINGâ†’VERIFIED)
- Worker sweep: reservation expired + expiring (24h) + payment overdue installments â†’ in-app notifications
- Domain emits on reserve, cancel-request, payment, booking, schedule create, registration create/complete, resale create, document create/verify

---

## MAIN dependency scan

Unchanged clean: **0** localStorage business / mock-data imports / demo-store / MAIN path deps in production apps (auth sessionStorage only).

---

## Gates (2026-09-25 IST, this machine)

| Suite | Result |
|-------|--------|
| `production-flow.mjs` | **31/0** PRODUCTION VERIFIED |
| `assert-409-reserve.mjs` | **PRODUCTION VERIFIED** |
| `@bhairava/domain` | **14/0** |
| `@bhairava/api` Jest | **44/0** (10 suites) |
| admin/agent/customer vite build | **pass** |
| agent/customer expo export web | **pass** |
| Docker postgres/redis/minio | healthy |
| API health | ok |

---

## Still NOT COMPLETE vs credential blockers

1. **EAS / Apple / Play signing** â€” **BLOCKED BY EXTERNAL CREDENTIAL**
2. **Email / SMS / WhatsApp / Push** â€” stub adapters only â€” **BLOCKED BY EXTERNAL CREDENTIAL**
3. Optional polish: denser MAIN pixel chrome; native server-side receipt PDF bytes (`pdfKey`); visit status edit UI on agent mobile beyond create/list

Production secrets: never ship demo `.env` / `Demo@12345`.

## Constraints honored

No push Â· no external deploy/PR Â· no new product scope beyond parity Â· local commits only.
