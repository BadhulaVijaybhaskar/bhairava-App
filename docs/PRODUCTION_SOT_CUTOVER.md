# Production Source-of-Truth Cutover

**Effective:** 2026-09-25 IST  
**Branch:** `feat/production-platform`

## Declaration

The monorepo apps and services below are the **sole production Source of Truth**:

1. `apps/admin-web`
2. `apps/agent-web`
3. `apps/customer-web`
4. `apps/agent-mobile`
5. `apps/customer-mobile`
6. `services/api`
7. `services/worker`

Supporting packages (`packages/domain`, `packages/database`, `packages/api-client`, etc.) are production libraries for those surfaces.

## Deprecated (reference / regression only)

The following trees are **deprecated for production runtime**. They may remain on disk for visual/regression comparison against tag `client-test-baseline-bd342fe`, but **must not** be required to run, build, or deploy production:

- `MAIN app/`
- `MAIN-agent/`
- `MAIN-customer/`
- `MAIN-agent-expo/`
- `MAIN-customer-expo/`
- Untracked `bhairava-admin/`, `bhairava-agent/`, `bhairava-customer/`, `bhairava-app/`
- `archive/` historical snapshots

**Not deleted** in this cutover (per migration policy). A later cleanup may move them under `legacy/reference/` after stakeholder sign-off.

## Runtime rule

Production start commands use only monorepo workspaces (`npm run start:prod -w @bhairava/api`, `npm run dev:*-web`, Expo apps under `apps/*-mobile`). Do not point Vite/Expo roots at MAIN*.
