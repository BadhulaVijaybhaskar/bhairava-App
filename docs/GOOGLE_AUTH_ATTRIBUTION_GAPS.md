# Google auth, invites, attribution, Bhairava Direct — honest gaps

Shipped on production tip synced from Astranova `main` (`ffdfa24`) via Badhula `feat/production-platform`.

Production path remains Nest + Prisma (no PLATFORM_SEED / mock repos / localStorage business data).

## Implemented (web)

- Customer / Agent Google continue + profile completion
- Agent **mobile required** (+ city/region) — no activate without normalized mobile; no OTP
- Production Google fallback safe: missing client ID → controlled unavailable message; **no** `!CLIENT_ID` bypass
- Invite email/phone hint binding; mismatch rejects without PII / attribution steal
- DIRECT_APP → Bhairava Direct; AGENT_INVITE → inviting agent; original attribution retained on reassignment
- Site visit request → primary agent else Bhairava Direct
- Brand (logo SoT): `#0250A1` / `#002C68` / `#90C8F8` / `#F0B038` / white / navy; green is semantic success only

## Gaps / follow-ups

1. **Expo Google auth** — not finished. See `docs/EXPO_GOOGLE_AUTH_GAP.md`.
2. Live Google Identity Services requires real `GOOGLE_CLIENT_ID_*` / `VITE_GOOGLE_CLIENT_ID_*`.
3. Preferred project picker UI still optional on customer onboarding.
4. `prisma migrate deploy` required against existing staging DBs before API boot.
5. Astranova write push of `feat/production-platform:main` only if write access + fast-forward.

## Migration

`packages/database/prisma/migrations/20260928043000_google_auth_invites_attribution/`
