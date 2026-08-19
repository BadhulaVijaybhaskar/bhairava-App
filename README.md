# Three hosts → three future mobile apps

| App | Folder | Port | Cookie prefix | Role gate |
|-----|--------|------|---------------|-----------|
| **Admin** | `bhairava-app` | **3000** | `bhairava_access` | `ADMIN` |
| **Agent** | `bhairava-agent` | **3001** | `bhairava_agent_*` | `SALES_AGENT` / `SALES_MANAGER` + linked Agent |
| **Customer** | `bhairava-customer` | **3002** | `bhairava_customer_*` | `CUSTOMER` (CRM row matched by email/mobile) |

Same Postgres / Prisma schema (`bhairava-app/prisma`). Separate Next.js apps so each can become its own mobile shell later (Capacitor / RN).

## Quick setup (local Postgres)

One-command bootstrap: installs/starts a local PostgreSQL, provisions the
`bhairava` role/database, writes each app's `.env`, installs dependencies,
generates the Prisma client, syncs the schema, and seeds demo data.

```bash
bash scripts/cloud-install.sh   # idempotent, safe to re-run
npm run dev:all                 # start all three portals
```

`scripts/cloud-start.sh` just brings Postgres online (used on every boot in
Cloud Agent environments). Both scripts are idempotent.

## Run

```bash
# from workspace root (Bhairava App)
npm run dev:admin      # :3000
npm run dev:agent      # :3001
npm run dev:customer   # :3002
npm run dev:all        # all three
```

Copy `.env` from admin into agent/customer (already done if scaffolded). Set:

- Admin `APP_URL=http://localhost:3000`
- Agent `APP_URL=http://localhost:3001`
- Customer `APP_URL=http://localhost:3002`

Generate clients:

```bash
npm run db:generate
```

Seed (from admin) also creates demo portal logins:

| Portal | Login | Password |
|--------|-------|----------|
| Admin | `admin@bhairava.com` | `Admin@12345` |
| Agent | `suresh.agent@bhairava.com` | `Agent@12345` |
| Customer | `demo.bought@example.com` | `Customer@12345` |

```bash
npm run db:seed --prefix bhairava-app
```
