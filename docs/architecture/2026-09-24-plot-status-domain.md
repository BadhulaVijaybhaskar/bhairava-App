# Plot Status — Domain & API Notes

**Status:** LOCKED (2026-09-24)  
**Companions:** three-app architecture, Project Portfolio OS §13, permission matrix

## Enum

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

No `HOLD`.

## Happy path

```text
AVAILABLE → RESERVED → BOOKED → UNDER_DOCUMENTATION → SOLD → REGISTERED
```

## Other allowed transitions

```text
AVAILABLE → BLOCKED
BLOCKED → AVAILABLE
RESERVED → AVAILABLE | CANCELLED | BOOKED
BOOKED → UNDER_DOCUMENTATION | CANCELLED
UNDER_DOCUMENTATION → BOOKED | SOLD | CANCELLED
CANCELLED → AVAILABLE
SOLD → REGISTERED | RESALE_AVAILABLE
REGISTERED → RESALE_AVAILABLE
RESALE_AVAILABLE → RESERVED | BLOCKED
```

## Persistence

- `plots.status` stores the canonical enum.
- `plot_status_history` is append-only: `plotId`, `fromStatus`, `toStatus`, `reason`, `actorId`, `source` (`SALES_FLOW` | `ADMIN_MANUAL` | `SYSTEM`), `createdAt`.
- Reject transitions not in the allow-list with `422`.
- Manual/exceptional transitions (`ADMIN_MANUAL`) require non-empty `reason` and permission `projects.plots.status_override` (Founder/Admin).

## API

- `PATCH /plots/:id/status` `{ toStatus, reason? }` — server validates transition + auth.
- Sales flows (`POST /reservations`, bookings, registration) drive status via domain services; clients do not set arbitrary status.
- List/filter endpoints accept the full enum; Overview metrics bucket all nine statuses.
- Customer Explore: detailed public fields for `AVAILABLE` and `RESALE_AVAILABLE`; other statuses return status (+ public-safe facts) without owner PII.

## Migration

Map legacy mock values (`available`, `reserved`, `booked`, `registered`, `resale`, any `hold`) → canonical uppercase enums (`resale` → `RESALE_AVAILABLE`, `hold` → `BLOCKED` unless a distinct business case is documented).