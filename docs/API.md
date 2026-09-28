# API

Base URL: `http://localhost:4000/api` (global prefix `api`).

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/auth/login` | Sets httpOnly `bhairava_refresh` cookie; returns accessToken |
| POST | `/auth/refresh` | Rotates refresh; reuse detects & revokes family |
| POST | `/auth/logout` | Revokes refresh / clears cookie |
| GET | `/auth/me` | Current principal |
| POST | `/auth/password-reset/request` | Stub |
| POST | `/auth/password-reset/confirm` | Stub |

## Core resources

- Projects, plots, layouts (polygon set/clear/relink/validate)
- Customers, leads, visits
- Reservations (FOR UPDATE), bookings
- Payments (+ void), documents (+ download URL)
- Notifications (in-app + stub channels)
- Audit (GET only — immutable)

## Ops

- `GET /health` — liveness
- `GET /ready` — DB + Redis

## Authz

Guards: JWT → PermissionsGuard → org binding from principal.  
Matrix: `@bhairava/permissions`.

## Correlation

Every response includes `x-request-id` / `x-correlation-id`. Errors return `{ statusCode, message, requestId }`.
