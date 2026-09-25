# Legacy MAIN* trees

Directories `MAIN app`, `MAIN-agent`, `MAIN-customer`, `MAIN-agent-expo`, `MAIN-customer-expo` are **DEPRECATED**.

- Not listed in npm `workspaces`
- Must not participate in production Docker images, deploy scripts, or production env
- Useful for UX regression / visual reference only
- Each folder contains `DEPRECATED.md`
- Production SoT: `apps/*`, `services/*`, `packages/*`

Default `npm run dev` starts the production stack (`dev:prod-stack`), not MAIN.
Use `npm run dev:legacy-main` only for intentional MAIN regression.
