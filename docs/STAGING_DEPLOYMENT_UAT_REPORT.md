# BHAIRAVA Staging Deployment + UAT Report

**Date (IST):** 2026-09-25 15:43:49 Asia/Calcutta (original local UAT)
**Follow-up (local staging re-verify):** 2026-09-25 16:40 Asia/Calcutta (IST) — BigInt + agent attribution confirmed on isolated stack @ `aa8f6fb`; harness + report push follows
**Security suite (cloud agent):** 2026-09-25 — PR #10 review findings 1–8 remediated; domain 14 + api-client 3 + api 85 tests green
**Windows Docker API verify (coordinator):** 2026-09-25 17:24 Asia/Calcutta (IST) — clean `docker build --no-cache` of `Dockerfile.api` -> image `bhairava-api:staging-verify`; container `/api/health`+`/api/ready` 200 on staging net; host staging restarted; UAT **54/54**; concurrency 201+409; domain 14 + api-client 3 + api 85; web builds + mobile tsc green
**Branch tip:** `d1274a4bcebdbb87c926611abc424f44e1ff27d2` (`d1274a4`) on `feat/production-platform` — Windows Docker/UAT re-verify (findings 1–8)
**PR:** https://github.com/BadhulaVijaybhaskar/bhairava-App/pull/10 — **OPEN / NOT MERGED**  
**RC tag:** `bhairava-production-rc1` @ `e29ec71`  
**Machine:** Windows (Vijay) — local isolated staging; cloud agent verified unit/API/security suite + clean workspace API build  

## Executive verdict

| Gate | Result |
|------|--------|
| Staging stack green for UAT (local isolated) | **YES** (restarted API on tip `aa8f6fb`; health/ready green) |
| Full checklist executed | **YES** â€” staging UAT **54/54** pass (was 47/47; +documents list roles + agent attribution steps) |
| Documents list BigInt 500 (code fix) | **CONFIRMED FIXED ON STAGING** â€” `GET /api/documents` = 200; `sizeBytes` decimal strings |
| Agent booking attribution (code fix) | **CONFIRMED ON STAGING** â€” Agent1 sees own (nâ‰¥1, PII); Agent2 n=0 / cross-GET 404 |
| Public DNS / managed hosting | **BLOCKED BY EXTERNAL CREDENTIAL / DNS** |
| Production promotion from this staging | **CONDITIONAL NO** â€” technically healthy as *local* staging; **not** approved as internet-facing staging, and PR must stay unmerged until explicit production authorization |
| Staging promotion readiness (local UAT evidence) | **CONDITIONAL YES (local-only)** â€” local gates green on tip with BigInt/attribution fixes; external DNS/TLS/creds still block internet staging |

**Do not merge PR #10. Do not deploy production. Do not publish stores.**

---

## A. Staging architecture (isolated from DEV)

| Resource | Staging | Dev (untouched) |
|----------|---------|-----------------|
| Compose project | `bhairava-staging` | `infrastructure` |
| Network | `bhairava_staging_net` | default compose network |
| Volumes | `bhairava_staging_{pg,redis,minio}` | `bhairava_{pg,minio}` |
| Postgres | `127.0.0.1:15432` / DB `bhairava_staging` / user `bhairava_stg` | `:5432` / `bhairava` |
| Redis | `127.0.0.1:16379` (password-protected) | `:6379` |
| MinIO | `127.0.0.1:19000` API / `:19001` console / bucket `bhairava-staging` | `:9000/:9001` / `bhairava` |
| API | `http://127.0.0.1:14000/api` (host Node process + staging env) | existing host/dev ports |
| Worker | host Node process â†’ staging Redis/DB | n/a / separate |
| Admin / Agent / Customer web targets | `14173` / `14174` / `14175` (CORS allowlist; builds verified) | `5173/5174/5175` |

**Compose file (committed):** `infrastructure/docker-compose.staging.yml`  
**Secrets (gitignored):** `.env.staging.local`, `artifacts/staging/credentials.md`  
**Harness:** `scripts/staging/`

API/Worker ran as **host processes** bound to staging infra containers (profile `full` Docker image build deferred). Secrets are unique staging values â€” **not** `minioadmin`, **not** `Demo@12345`, **not** shared JWT/PII with `.env.development`.

---

## URLs

| Surface | URL | Notes |
|---------|-----|-------|
| API | http://127.0.0.1:14000/api | Local staging |
| Health | http://127.0.0.1:14000/api/health | `status=ok` |
| Ready | http://127.0.0.1:14000/api/ready | DB+Redis up |
| MinIO API | http://127.0.0.1:19000 | Bucket `bhairava-staging` |
| MinIO console | http://127.0.0.1:19001 | |
| Admin web | http://127.0.0.1:14173 | CORS allowlisted; production build OK |
| Agent web | http://127.0.0.1:14174 | CORS allowlisted; production build OK |
| Customer web | http://127.0.0.1:14175 | CORS allowlisted; production build OK |
| Public admin/agent/customer/api hostnames | â€” | **BLOCKED BY EXTERNAL CREDENTIAL / DNS** |

---

## B. Database

- `prisma migrate deploy` â†’ applied `20260924120000_init`; status **up to date**
- DB name `bhairava_staging` isolated
- Seed approach: **founder bootstrap + synthetic UAT fixtures** (no demo seed password)

## C. Founder bootstrap

- `ALLOW_FOUNDER_BOOTSTRAP=yes` + strong staging-only password
- `Demo@12345` / `Demo@12345` rejected by bootstrap guard â€” **PASS**
- Org `BHAIRAVA-STG` + FOUNDER user created; company settings include `mustRotateFounderPassword`
- Audit trail present (`audit_logs` â‰¥ 1 after fixtures)

## D. Domains / cookies / CORS

- Public DNS: **BLOCKED BY EXTERNAL CREDENTIAL / DNS**
- CORS allowlist = localhost staging web origins only; unknown origin `evil.example.com` â†’ no ACAO â€” **PASS**
- `COOKIE_SECURE=false` + `COOKIE_SAMESITE=lax` via **staging-specific env** for HTTP localhost only (documented limitation; production path still requires Secure cookies / HTTPS)

## E. Object storage

- Staging bucket `bhairava-staging` created
- Document create **201**
- Signed download `GET /api/documents/:id/download` â†’ MinIO presigned URL â€” **PASS**
- **CONFIRMED FIXED ON STAGING:** `GET /api/documents` returns **200** for Founder/Admin/Finance/Agent; `sizeBytes` serialized as decimal **string** (no BigInt crash). Customer empty list 200. Pagination query accepted (200).

## F. Worker / reservation expiry

- Worker running (60s sweep)
- Flow: AVAILABLE â†’ RESERVED â†’ force `expiresAt` past â†’ worker â†’ AVAILABLE + `EXPIRED` â€” **PASS** (~20s)
- `plot_status_history` rows written â€” **PASS**

## G. Security negatives (all server-side fails)

| Case | Result |
|------|--------|
| Unauthenticated protected route | 401 |
| Invalid refresh | 401 |
| Viewer mutation | 403 |
| Finance â†’ project setup | 403 |
| Agent â†’ plot master create | 403 |
| Agent1 â†” Agent2 customer isolation | PASS (no overlap; cross-id 404) |
| Customer â†’ INTERNAL document | 404 |
| Customer1 â†’ Customer2 booking | 404 |
| Agent â†’ other agent booking | 404 |
| Receipt PDF unauth | 401 |
| Receipt PDF other customer | 404 |

## H. Full UAT Founderâ†’Resale

Automated path exercised: lead â†’ reserve â†’ book â†’ pay â†’ receipt PDF â†’ registration â†’ resale (**201** on corrected payload).  
Agent/customer booking list visibility: **re-verified** â€” Agent create sets `agentId`; Agent1 list shows own bookings with customer PII; Agent2 list excludes unrelated + GET returns 404; customer sees own. Responsible agent `{id,code,name}` present on attributed bookings.

## I. Mobile against staging

- `apps/*-mobile/.env.staging` â†’ `EXPO_PUBLIC_API_URL=http://127.0.0.1:14000/api` (gitignored pattern)
- `tsc --noEmit` agent-mobile + customer-mobile â€” **exit 0**
- No store signing / EAS â€” **BLOCKED BY EXTERNAL CREDENTIAL** (by design)

## J. Receipt PDF

- `GET /api/receipts/:id/pdf` authenticated finance â€” **200**, PDF bytes ~2268, `%PDF` magic
- Unauthorized / other customer blocked â€” **PASS**

## K. Observability

- `/health` ok, `/ready` db+redis up, worker queue note present
- Request correlation / timestamps present; secrets not echoed in health payloads

## L. Backup / restore

- `pg_dump -Fc` staging â†’ `artifacts/staging/bhairava_staging.dump` (gitignored)
- Restore into `bhairava_staging_restore` â†’ **8 users** verified
- Object storage recovery: re-point `S3_*` to staging MinIO + restore bucket objects from MinIO versioning/backup (bucket isolated; document recovery procedure remains ops runbook)

## M. Final gates (local re-verify on tip `aa8f6fb` + harness push)

| Gate | Result |
|------|--------|
| Secret scan | `ok: true`, `blockedCount: 0` |
| Domain tests | **14/14** pass |
| API tests | **66/66** pass (13 suites) |
| Privacy negatives (`privacy.spec`) | **8/8** pass |
| Staging reservation concurrency | **PASS** (statuses 201+409, no 500) |
| Founderâ†’Resale staging UAT harness | **54/54** pass (0 fail) |
| Admin/Agent/Customer web production builds | all **green** |
| Expo agent+customer `tsc --noEmit` | **green** |
| Documents list â‰  500 / sizeBytes string | **PASS** (Founder/Admin/Finance/Agent1; Customer empty 200) |
| Agent1 vs Agent2 attribution | **PASS** (own list + PII; cross 404; unauth 401) |
| Receipt PDF auth/isolation | **PASS** (auth 200; unauth 401; other customer 404) |
| production-flow.mjs (demo-seed harness) | **N/A on staging** â€” targets demo seed; staging equivalent is `scripts/staging/run-uat.mjs` 54/54 |
| API rebuild before staging restart | **green** |

## N. Test identities (names only â€” passwords in gitignored credentials file)

Founder, Admin, Finance, Viewer, Agent1, Agent2, Customer1, Customer2 â€” emails `*@staging.bhairava.local`.  
Credentials path (local only): `artifacts/staging/credentials.md` and `.env.staging.local`.

## Blockers

1. **Public DNS / TLS / hosting credentials** â€” local HTTP staging only
2. **Email / SMS / WhatsApp / Push providers** â€” BLOCKED BY EXTERNAL CREDENTIAL
3. **Mobile store signing / EAS** â€” BLOCKED BY EXTERNAL CREDENTIAL

~~Documents list BigInt 500~~ and ~~Agent booking attribution~~ are **fixed and confirmed on local isolated staging** (see O / M).

**Code fix tip:** `2edeb217` / `bad50c6` (BigInt JSON + agent attribution).

## O. Post-UAT defect fixes (cloud agent â€” unit/API tests only)

### O.1 Documents list BigInt HTTP 500 â€” root cause

- **Exact cause:** Prisma maps PostgreSQL `BigInt` columns to JavaScript `bigint`. `DocumentsService.list()` returned rows including `sizeBytes` as raw `bigint`. Nest/Express `JSON.stringify` then threw `TypeError: Do not know how to serialize a BigInt` â†’ HTTP 500.
- **Create/replace** paths already coerced `sizeBytes` (previously via `Number(...)`); **list** and **verify** did not.
- **Fix approach:** API-wide response boundary â€” `BigIntJsonInterceptor` (`APP_INTERCEPTOR`) recursively converts every `bigint` to a **decimal string** (preserves precision beyond `Number.MAX_SAFE_INTEGER`). Plus explicit service-level `toString()` on document/booking/reservation/payment/finance responses (defense in depth). Representation is **string in JSON** for all DB BigInt values.

### O.2 Endpoints audited / fixed

| Area | Risk | Mitigation |
|------|------|------------|
| `GET /documents` list | `sizeBytes` bigint â†’ 500 | list maps to string + global interceptor |
| `POST /documents`, replace, verify | sizeBytes | string at DTO boundary |
| `GET/POST /bookings` | `agreementValuePaise`, `advancePaise` | already stringified; interceptor backup |
| `GET/POST /reservations` | `amountPaise` | stringify + interceptor; agent filter added |
| `GET/POST /payments`, void/adjust | `amountPaise` | stringify + interceptor |
| Ops receipts / commissions / schedules / resales / reports | paise BigInts | pre-existing `toString()` + interceptor |
| Registrations | no BigInt columns | interceptor only |

### O.3 Agent booking attribution

- **Create:** when actor role is `AGENT`, `agentId` is forced to the actorâ€™s `AgentProfile.id` (mirrors leads/visits). Staff may pass `agentId` or inherit `customer.agentId` / reservation agent. Unassigned customers get `agentId` set on book.
- **List filter (server-side):** agents without `allAgentsAccess` see bookings where `booking.agentId = me` **OR** `customer.agentId = me`.
- **Projection:** `projectCustomerPii` â€” agents get customer name/phone only when they own the relationship; otherwise redacted. `responsibleAgent` / `agent` `{ id, code, name }` always included when present.
- **UI:** agent-web Bookings table shows Customer, Agent (code), Agreement (paise) aligned with API projection.

### O.4 Local staging re-verify (this session â€” Vijay Windows machine)

| Check | Result |
|-------|--------|
| Pull tip `aa8f6fb`, rebuild API, restart staging API/worker | **PASS** â€” health/ready green |
| `GET /api/documents` Founder/Admin/Finance/Agent | **200**, `sizeBytes` typeof string, no BigInt 500 |
| Customer documents list | **200** empty (visibility filter) |
| Agent1 bookings list | **200**, sees own booking(s), customer PII when related |
| Agent2 bookings list / cross-GET | **0 rows** / **404**; unauth **401** |
| New Agent1 booking `agentId` attributed | **PASS** |
| Full staging UAT harness | **54 pass / 0 fail** |
| Concurrency double-reserve | **201 + 409** |

### O.5 Staging root-cause confirmation (live)

Prior API log on old build: `GET /api/documents` → `TypeError: Do not know how to serialize a BigInt` → HTTP 500.
After rebuild with `BigIntJsonInterceptor` + service `toString()`: same endpoint **200** with `"sizeBytes":"<decimal-string>"`.

## Q. PR #10 review remediation — security suite (cloud agent, 2026-09-25)

**Scope:** Fix all 8 open Codex review findings on `feat/production-platform` (PR #10). BigInt serialization + agent booking attribution preserved (no regression).

### Q.1 Finding status

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | Docker API builds workspace `dist/` packages | **FIXED + PROVEN ON WINDOWS** | Clean `docker build --no-cache -f infrastructure/Dockerfile.api -t bhairava-api:staging-verify .` exit 0 (domain→permissions→prisma generate→nest build). Ran container on `bhairava_staging_net` `:14001`; `GET /api/health` 200 `status=ok`; `GET /api/ready` 200 db+redis up. |
| 2 | Serialize concurrent token refresh | **FIXED** | `@bhairava/api-client` single in-flight refresh promise; **3/3** concurrent-refresh tests pass (one refresh for 5×401; failure clears once; cookie restore). |
| 3 | Reservation list ownership | **FIXED** | Customer self / Agent own+assigned / staff org-wide; cancel-request ownership; privacy suite. |
| 4 | Document list + signed URL ownership | **FIXED** | AGENT_VISIBLE org packs; CUSTOMER_PROFILE_RELATED scoped to assigned customers for **list and download**; Agent2 ID guess denied. |
| 5 | Agent payment ownership | **FIXED** | `finance.view` for AGENT scoped; `GET /payments/:id`; schedules/receipts/registrations/resales/commissions audited. |
| 6 | Reservation→booking customer match | **FIXED** | Same-tx `reservation.customerId === booking.customerId`; mismatch rejects; reservation unchanged. |
| 7 | Web session restoration | **FIXED** | Agent + customer web: `AUTH_INITIALIZING` → cookie refresh restore → then protected route; refresh **not** in localStorage. |
| 8 | Atomic receipt numbers | **FIXED** | `organizations.receiptCounter` + `UPDATE … RETURNING`; RCP-* format; P2002 → 409 Conflict (no Prisma 500 leak). Migration `20260925120000_receipt_counter`. |

### Q.2 Automated test / build totals (this VM)

| Suite | Result |
|-------|--------|
| `@bhairava/domain` | **14/14** pass |
| `@bhairava/api-client` concurrent refresh | **3/3** pass |
| `@bhairava/api` (incl. ownership-audit + prior privacy) | **85/85** pass (14 suites) |
| Clean workspace package order → API build | **PASS** (`domain` → `permissions` → `prisma generate` → `api`) |
| `@bhairava/agent-web` / `@bhairava/customer-web` production build | **PASS** |
| Docker image build + container `/health` `/ready` | **PASS (Windows)** — `bhairava-api:staging-verify` sha256:96a5b58d…; health/ready 200 on `:14001` against staging postgres/redis/minio |

### Q.3 Expanded privacy / ownership audit coverage

New `services/api/src/privacy/ownership-audit.spec.ts` covers negative cases for: reservations, documents (list+download), payments, schedules, registrations, commissions, notifications, reservation→booking integrity, receipt concurrency, web session boot contract. Shared helper `services/api/src/common/ownership/record-scope.ts` is the server-side SoT used by payments/documents/ops/finance.

### Q.4 Remaining external blockers (unchanged)

- Public DNS / TLS for internet-facing staging
- External notification provider credentials (email/SMS/WhatsApp/push still stubs)
- EAS / mobile store publish credentials
- **Do not merge PR #10. Do not deploy production. Do not publish stores.**

## Promotion decision

- **Local isolated staging UAT (tip with BigInt + attribution):** technically successful (**CONDITIONAL YES**, local-only).
- **Internet-facing staging / production promotion:** **NO** until DNS/TLS, external notification credentials, and explicit merge/production authorization.
- **PR #10 remains OPEN and unmerged.** Do not merge. Do not deploy production. Do not publish stores.
- **Security review remediation (Q):** code + automated suite green; **Windows coordinator re-verify complete** — Docker clean build + container health/ready, host staging restart, UAT 54/54, concurrency 201+409, web/mobile gates green. **Do not merge PR #10.**

## P. Artifacts (gitignored)

- `artifacts/staging/uat-results.json` — 54/54
- `artifacts/staging/concurrency-results.json` — 201+409
- `artifacts/staging/credentials.md`, `.env.staging.local` — local secrets only

## R. Windows coordinator re-verify (2026-09-25 17:24 IST)

Machine `b1a1fbdb-c95f-4dec-bacb-6d16fae8d5c5` (Vijay). Branch `feat/production-platform` @ pre-push tip `dc7c855+`.

| Check | Result |
|-------|--------|
| `git pull --ff-only` | Already up to date @ `dc7c855` |
| Clean Docker API build (`--no-cache`) | **PASS** — `bhairava-api:staging-verify` |
| Docker container `/api/health` `/api/ready` | **PASS** — both 200 on `:14001` via staging network |
| Host staging API/worker restart (tip build) | **PASS** — `:14000` health/ready 200 |
| `prisma migrate deploy` (staging) | **PASS** — applied `20260925120000_receipt_counter` |
| Secret scan | `ok: true`, `blockedCount: 0` |
| Domain / api-client / api tests | **14 / 3 / 85** pass |
| Staging UAT harness | **54/54** pass |
| Reservation concurrency | **201 + 409** (no 500) |
| Admin / Agent / Customer web builds | **PASS** |
| Agent + customer mobile `tsc --noEmit` | **PASS** |
| Worker Prisma JSON typing after generate | **FIXED** — `payloadJson: Prisma.InputJsonValue` |

### R.1 Finding status (Windows evidence)

| # | Finding | Status |
|---|---------|--------|
| 1 | Docker API builds workspace `dist/` packages | **FIXED + PROVEN** (clean image build + health/ready) |
| 2 | Serialize concurrent token refresh | **FIXED** (api-client 3/3) |
| 3 | Reservation list ownership | **FIXED** (api 85 + UAT isolation) |
| 4 | Document list + signed URL ownership | **FIXED** (UAT list roles + signed URL; sizeBytes string) |
| 5 | Agent payment ownership | **FIXED** (ownership-audit in api 85) |
| 6 | Reservation→booking customer match | **FIXED** (ownership-audit + UAT booking path) |
| 7 | Web session restoration | **FIXED** (api-client cookie restore + web builds) |
| 8 | Atomic receipt numbers | **FIXED** (migration applied on staging; UAT receipt PDF 200) |

**Do not merge PR #10. Do not deploy production. Do not publish stores.**
