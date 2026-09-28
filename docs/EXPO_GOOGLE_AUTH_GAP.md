## Expo / mobile Google auth — honest gap

**Web first** for Customer + Agent Google continue, profile completion, invites, and site-visit routing.

`apps/agent-mobile` and `apps/customer-mobile` (Expo) are **not** claimed finished for Google Sign-In in this PR.

### Remaining Expo work (next APK task)
- Wire `@react-native-google-signin/google-signin` (or Expo AuthSession) to the same Nest endpoints:
  - `POST /api/auth/google/customer` + `POST /api/auth/customer/complete-profile`
  - `POST /api/auth/google/agent` + `POST /api/auth/agent/complete-profile`
- Agent mobile required (no OTP) on profile complete
- Invite deep-link claim with hint binding
- Production builds must not enable `GOOGLE_AUTH_DEV_BYPASS` / `VITE_GOOGLE_AUTH_DEV_BYPASS`

Do not treat this document as completion of Expo Google auth.
