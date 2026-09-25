# Staging UAT Checklist

Use staging credentials only. Mark each row Pass/Fail with tester initials + IST timestamp.

## A. Founder / Admin

- [ ] Login with Founder bootstrap account (not Demo@12345 in prod-like staging if bootstrap used)
- [ ] Org settings view/update
- [ ] Invite/manage users (Admin/Finance/Viewer/Agent)
- [ ] Project create + setup (phases/blocks/media if enabled)
- [ ] Plot inventory create/edit/status transitions
- [ ] Layout editor save/reload
- [ ] Audit log visible; audit API rejects mutate from clients

## B. Finance

- [ ] Record payment against booking
- [ ] Receipt list + detail shows persisted amount (server values)
- [ ] Download receipt PDF (`GET /api/receipts/:id/pdf`) ? A4, branding, amount-in-words
- [ ] Void payment (soft) with reason; voided remains auditable
- [ ] Payment schedule create + collections view
- [ ] Commissions list (no unauthorized mutate if role limited)
- [ ] **Negative:** Finance cannot edit Project Setup / plot master

## C. Viewer

- [ ] Can view projects, finance summaries, reports
- [ ] **Negative:** Viewer cannot create/update/delete projects, plots, payments, bookings

## D. Agent

- [ ] Login; see only assigned customers (Agent1 ? Agent2 PII)
- [ ] Leads / visits / reservations / bookings for own book
- [ ] Documents: agent-visible + customer-related only
- [ ] Receipt visibility limited to permitted customers
- [ ] **Negative:** Agent cannot edit master plot setup / org settings / audit

## E. Customer

- [ ] Login; see own bookings/payments/documents only
- [ ] Download own receipt PDF; other customer receipt ID returns 404
- [ ] **Negative:** No INTERNAL project documents
- [ ] **Negative:** Unauthorized ID enumeration returns 404 (not 403 leakage)

## F. Cross-cutting negatives

- [ ] Suspended user cannot login/refresh
- [ ] Refresh reuse detection invalidates family
- [ ] CORS rejects unknown origin (staging allowlist)
- [ ] Rate limit on auth endpoints
- [ ] External Email/SMS/WhatsApp/Push without credentials ? BLOCKED BY EXTERNAL CREDENTIAL (in-app still works)

## Sign-off

| Role | Tester | Date (IST) | Result |
|------|--------|------------|--------|
| Founder/Admin | | | |
| Finance | | | |
| Viewer | | | |
| Agent | | | |
| Customer | | | |
