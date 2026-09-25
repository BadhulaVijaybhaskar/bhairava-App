# Mobile Build Readiness (Phase 29)

**Updated:** 2026-09-24 IST

## Status summary

| Item | Agent mobile | Customer mobile |
|------|--------------|-----------------|
| Expo `app.json` | Validated / expanded | Validated / expanded |
| `eas.json` profiles | Present (dev/preview/prod) | Present |
| SecureStore auth | Implemented (Wave 2) | Implemented |
| EAS projectId | **PLACEHOLDER** | **PLACEHOLDER** |
| Android keystore / Play credentials | **BLOCKED BY EXTERNAL CREDENTIAL** | **BLOCKED BY EXTERNAL CREDENTIAL** |
| iOS Apple Team / certs / provisioning | **BLOCKED BY EXTERNAL CREDENTIAL** | **BLOCKED BY EXTERNAL CREDENTIAL** |
| Store listing assets | Not provided | Not provided |

Signing / store submission is **BLOCKED BY EXTERNAL CREDENTIAL** — do not fake completion.

## Local run (no signing)

```bash
EXPO_PUBLIC_API_URL=http://<lan-ip>:4000 npm start -w @bhairava/agent-mobile
EXPO_PUBLIC_API_URL=http://<lan-ip>:4000 npm start -w @bhairava/customer-mobile
```

## When credentials exist

1. `npx eas-cli login`
2. `npx eas-cli init` in each app — replace `extra.eas.projectId`
3. Configure Android credentials / iOS Apple team via EAS
4. `npx eas-cli build -p android --profile preview`
5. `npx eas-cli build -p ios --profile preview`

Until then: config scaffolding is ready; production/store builds remain blocked.
