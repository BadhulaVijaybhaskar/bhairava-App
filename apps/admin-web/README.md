# @bhairava/admin-web

Desktop-first production admin. Behavioral UX SoT remains `MAIN app` until cutover is signed off.
All business data comes from the live API — sessionStorage holds **auth tokens only**.

## Run

```bash
# API already on :4000
npm run start:prod -w @bhairava/api

npm run dev -w @bhairava/admin-web
```

Open http://localhost:5173 (Vite proxies `/api` → `:4000`).

Demo: `admin@bhairava.demo` / `Demo@12345`

## Screens (API-wired shell)

Dashboard, Projects (+ workspace tabs), Plots (reserve/book), Customers (+ PII reveal), Leads, Visits,
Payments, Documents (presigned upload/download), Notifications, Audit, Reports placeholders,
Settings (company/users/billing placeholders), Founder danger zone (gated).
