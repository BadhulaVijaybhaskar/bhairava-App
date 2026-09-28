# Bhairava ? Release & Deployment Readiness Report

**Generated:** 2026-09-25 IST  
**Branch:** `feat/production-platform`  
**Start tip:** `4a9d5b9`  
**Current tip:** `996e90d` (`996e90d1836c81442a435dd0dfbbeac0502c7977`). Confirm with `git rev-parse HEAD`.
**Push status:** **NOT PUSHED** (explicit stop at push boundary)

## Commits since start tip

`
f4623d8 docs(release): tip SHA 8b59d83 on readiness report
8b59d83 docs(release): readiness report + gate fixes (PDF test, scan allowlist, mobile skipLibCheck)
501ff67 feat(release): receipt PDF, security headers/CORS, staging/prod contracts, bootstrap guards
c84126f chore(release): hygiene â€” gitignore, untrack QA shots, strip demo login defaults, secret-scan
`

*(Plus follow-up commit(s) for gate fixes / this report if present after this document lands.)*

---

## 1. Secret-scan result

- Tool: `npm run scan:secrets` ? `scripts/security/secret-scan.cjs` (gitleaks/trufflehog not installed)
- Result: **PASS** ? `blockedCount: 0` (findings present only in allowlisted seed/docs/examples/guards)
- Demo password `Demo@12345`:
  - Allowed in `packages/database/prisma/seed.ts` (dev/staging seed only) + docs/e2e
  - **Removed** from production app login defaults (`apps/*-web`, `apps/*-mobile`)
  - Founder bootstrap **rejects** Demo@12345 / weak passwords
  - Seed **refuses** when `NODE_ENV=production`
- No tracked `.env` secrets; `.env` gitignored; only `*.example` templates tracked
- Untracked from index: `MAIN app/qa-screenshots/*`, `rumik-one-rupee-demo.json`
- Report artifact (local): `artifacts/secret-scan-report.json` (gitignored via artifacts/)

**Suspicious before push:** None blocking. Review allowlisted demo references in README/e2e before first public push.

---

## 2. Receipt PDF status

| Item | Status |
|------|--------|
| Library | `pdfkit` in `@bhairava/api` |
| Generator | `services/api/src/ops/receipt-pdf.ts` |
| Endpoint | `GET /api/receipts/:id/pdf` (permission `finance.view`) |
| Source of truth | Persisted Payment + Receipt rows only (no client financials) |
| Content | Branding, receipt #, customer, project, plot, booking ref, amount, amount-in-words (INR), method, txn ref, payment date, generated date, authorized/generated-by |
| Format | A4, `application/pdf`, `Content-Disposition: attachment` |
| Permissions | Customer: own only; Agent: own customers (unless `allAgentsAccess`); staff: org-scoped |
| Tests | `receipt-pdf.spec.ts` (format/words/PDF magic) ? included in API suite |

Admin web still has HTML print path; **server PDF is the production download path**.

---

## 3. Staging readiness

- Contract: `docs/STAGING_ENVIRONMENT.md`
- Template: `.env.staging.example` (separate from `.env.example` / `.env.production.example`)
- Services covered: Postgres, Redis, S3-compatible, API, Worker, Admin/Agent/Customer web (+ mobile API URL)
- Rule: never reuse development/demo secrets

---

## 4. Production env requirements

See `.env.production.example` and `docs/ENVIRONMENT.md` / `docs/STAGING_ENVIRONMENT.md`.

Required (API):

- `NODE_ENV=production`
- `DATABASE_URL`, `REDIS_URL`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (?32, not change-me/demo)
- `PII_ENCRYPTION_KEY` (64 hex)
- `COOKIE_SECURE=true`
- `CORS_ORIGINS` comma allowlist (Admin/Agent/Customer origins)
- `S3_*` (not minioadmin)
- Distinct `ADMIN_WEB_URL`, `AGENT_WEB_URL`, `CUSTOMER_WEB_URL`, `API_PUBLIC_URL`, `MOBILE_API_URL`

Web: `VITE_API_URL` via `apps/*-web/.env.production.example`  
Mobile: `EXPO_PUBLIC_API_URL` via `apps/*-mobile/.env.production.example` + EAS env

---

## 5. Migration / bootstrap process

- Doc: `docs/DATABASE_RELEASE.md`
- Deploy migrations: `npm run db:migrate:deploy`
- Production Founder bootstrap: `ALLOW_FOUNDER_BOOTSTRAP=yes` + strong `FOUNDER_*` ? `npm run db:bootstrap`
- Demo seed: **FORBIDDEN** in production (`seed.ts` exits)
- Staging seed optional with non-production `NODE_ENV` + explicit allow

---

## 6. Security headers / CORS status

Implemented in `services/api/src/main.ts` + env schema:

- HTTPS enforcement hint (reject non-https when `x-forwarded-proto` in production)
- Secure cookies (`COOKIE_SECURE`), HttpOnly, SameSite (`COOKIE_SAMESITE`)
- CSP (`default-src 'none'`), HSTS (prod), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- CORS allowlist via `CORS_ORIGINS` (**required** in production)
- JSON body limit (`JSON_BODY_LIMIT`), upload limit env `MAX_UPLOAD_BYTES`
- Global auth/API throttling (`THROTTLE_*`)

Staging must not weaken these for convenience (same headers; separate secrets/origins).

---

## 7. Observability readiness

- Structured logs: `services/api/src/common/logging/logger.ts`
- Request correlation: `RequestIdMiddleware` (`x-request-id` / `x-correlation-id`)
- Exception filter: `AllExceptionsFilter`
- Health: `GET /api/health` (liveness), `GET /api/ready` (DB + Redis)
- Worker: process-local / BullMQ (noted on ready payload)
- External APM/error monitoring: **integration point ready when credentials absent** ? do not fake; configure Sentry/etc. later via env when supplied
- Redaction: avoid logging tokens / full PII (existing logger audit notes)

---

## 8. Backup policy location

- Runbook: `docs/BACKUP_RESTORE.md` (includes operational schedule)
- Scripts: `scripts/backup/pg_dump.sh`, `pg_dump.ps1`, `pg_restore.sh`, `minio_notes.md`

---

## 9. UAT checklist location

- Staging functional UAT: `docs/STAGING_UAT_CHECKLIST.md`
- Privacy UAT: `docs/PRODUCTION_DATA_PRIVACY_UAT.md`
- Automated privacy: `services/api/src/privacy/privacy.spec.ts` (+ domain PII projector)

---

## 10. External provider credentials required

| Channel | Status |
|---------|--------|
| In-app | Ready |
| Email / SMS / WhatsApp / Push | **BLOCKED BY EXTERNAL CREDENTIAL** until provider keys set (stubs return blocked, never fake `ok: true`) |

See `docs/EXTERNAL_NOTIFICATIONS.md`.

---

## 11. Mobile signing credentials required

| Item | Status |
|------|--------|
| App IDs / EAS profiles / SecureStore / env | Ready in repo |
| Expo Android export | **PASS** (agent + customer) |
| Expo Web export | **PASS** (agent + customer) |
| `tsc --noEmit` | **PASS** (agent + customer) |
| EAS project IDs, Apple certs, Play keystore | **BLOCKED BY EXTERNAL CREDENTIAL** |

See `docs/MOBILE_RELEASE.md`.

---

## 12. Gate totals + build results

| Gate | Result |
|------|--------|
| Secret scan | PASS (0 blocked) |
| Domain unit | **14 passed** / 0 failed |
| API unit/integration | **49 passed** / 0 failed (11 suites) |
| Privacy/security tests | included in API suite (extended receipt ownership helpers) |
| Production-flow E2E | **31 passed** / 0 failed (`scripts/e2e/production-flow.mjs`) |
| Concurrency | Covered in production-flow / reservation 409 scripts (no separate failure) |
| Admin vite build | PASS |
| Agent vite build | PASS |
| Customer vite build | PASS |
| API `nest build` | PASS |
| Agent expo export | PASS |
| Customer expo export | PASS |
| Agent/customer `tsc --noEmit` | **PASS** (unified `@types/react@19.3.0` via root overrides) |
| MAIN* runtime import into SoT | **0 unexpected path imports** (comment/`className="main"` false positives only). Workspaces exclude MAIN*. Doc: `docs/LEGACY_MAIN.md` |

---

## 13. Remaining production blockers

1. **External notification credentials** (Email/SMS/WhatsApp/Push) ? blocked until supplied  
2. **Mobile store signing** (EAS project IDs, Apple, Play) ? blocked until supplied  
3. **Real production secrets** (JWT, PII key, S3, DB, Redis, CORS origins, domains) ? must be provisioned out-of-band  
4. **Managed infra deploy** ? not performed (constraint: no external deploy)  
5. ~~**Mobile typecheck clean**~~ ? **RESOLVED** (`tsc --noEmit` PASS for agent + customer)
6. **Optional:** wire real Email/SMS adapters once credentials exist; replace EAS `REPLACE_WITH_EAS_PROJECT_ID`

---

## 14. Proposed first production GitHub push (DO NOT EXECUTE)

Verify tip, then:

```
996e90d docs(release): tip c7052e1 â€” mobile tsc gate closed
c7052e1 fix(mobile): unify @types/react@19.3.0 â€” agent+customer tsc --noEmit green
238cf96 docs(release): finalize readiness report tip guidance
2bf11fa docs(release): tip SHA 8b59d83 on readiness report
8b59d83 docs(release): readiness report + gate fixes (PDF test, scan allowlist, mobile skipLibCheck)
501ff67 feat(release): receipt PDF, security headers/CORS, staging/prod contracts, bootstrap guards
c84126f chore(release): hygiene â€” gitignore, untrack QA shots, strip demo login defaults, secret-scan
```

**Do not** `git push --force`. **Do not** deploy from this phase.

---

## Workstream checklist (1?16)

| # | Workstream | Status |
|---|------------|--------|
| 1 | Repository hygiene | DONE |
| 2 | Isolate legacy MAIN* | DONE (workspaces + docs + default `npm run dev` ? prod stack) |
| 3 | Server receipt PDF | DONE |
| 4 | Staging env contract | DONE |
| 5 | DB release process | DONE |
| 6 | Production Founder bootstrap | DONE (guardrails) |
| 7 | Domain / web config | DONE (env-driven) |
| 8 | Production security headers | DONE |
| 9 | Observability | DONE (APM credentials optional later) |
| 10 | Backup policy | DONE |
| 11 | Staging UAT script | DONE |
| 12 | Privacy UAT | DONE |
| 13 | External notifications | DONE / blocked on credentials |
| 14 | Mobile release | DONE / signing blocked on credentials |
| 15 | Final pre-push gate | DONE (mobile tsc PASS) |
| 16 | No push + this report | DONE |

---

*End of report. Tip `996e90d`. Mobile tsc gate closed. Still at push boundary (no push executed).*
