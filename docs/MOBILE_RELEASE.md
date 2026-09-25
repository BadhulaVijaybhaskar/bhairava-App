# Mobile Release Readiness

Apps: `apps/agent-mobile`, `apps/customer-mobile` (Expo).

## Ready in repo

- App IDs: `com.bhairava.agent`, `com.bhairava.customer` (see each `app.json`)
- EAS profiles: `eas.json` (development / preview / production)
- SecureStore plugin for tokens
- Env: `.env.example` / `.env.production.example` ? `EXPO_PUBLIC_API_URL`
- Icons/splash: configure assets under each app before store submit

## Production API

Set `EXPO_PUBLIC_API_URL=https://api.example.com/api` in EAS secrets / production profile env.

## Signing ? BLOCKED BY EXTERNAL CREDENTIAL

Until supplied, store builds cannot complete:

- EAS project IDs (replace `REPLACE_WITH_EAS_PROJECT_ID`)
- Apple Developer team / distribution cert / provisioning
- Google Play service account / upload keystore
- `eas credentials` configured for both apps

## Local verification (no store)

```bash
npm run typecheck -w @bhairava/agent-mobile   # if script present
npx expo export --platform android -w @bhairava/agent-mobile
npx expo export --platform android -w @bhairava/customer-mobile
```
