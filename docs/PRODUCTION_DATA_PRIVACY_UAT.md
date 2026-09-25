# Production Data Privacy UAT

Automated coverage lives in:

- `services/api/src/privacy/privacy.spec.ts`
- Domain PII projector tests in `@bhairava/domain`
- Permissions matrix: `packages/permissions/src/matrix.ts`
- E2E: `scripts/e2e/production-flow.mjs` (staging/dev stack)

## Manual / staging privacy checklist

- [ ] Agent1 cannot list or open Agent2 customers (PII redacted / 404)
- [ ] Customer1 cannot access Customer2 booking, payment, document, or receipt (404)
- [ ] Customer cannot fetch INTERNAL project documents
- [ ] Viewer has no mutate on setup/plots/sales/finance operate
- [ ] Finance cannot edit Project Setup / plot master data
- [ ] Agent cannot edit org master data / settings / audit
- [ ] Cross-org resource IDs return 404 (no existence leak via 403)
- [ ] Receipt PDF endpoint enforces same ownership rules as JSON receipt
- [ ] Logs never contain raw JWT, refresh tokens, PAN, Aadhaar, or full card numbers
- [ ] PII at rest uses AES-256-GCM (`PII_ENCRYPTION_KEY`)

## Server-side enforcement note

UI hiding is insufficient. All checks above must hold when calling the API directly with a stolen/scoped token.
