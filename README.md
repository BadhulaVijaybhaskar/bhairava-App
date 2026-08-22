# Bhairava Land Sales OS

The live product is **`MAIN app/`**.

Older Admin / Agent / Customer Next.js portals were moved to **`archive/`** and are not required for the current demo.

```bash
cd "MAIN app"
bun run dev -- --host 0.0.0.0 --port 8080
```

Demo login: `admin@bhairava.com` / `admin@2026`

## Archived portals

| App | Folder | Port |
|-----|--------|------|
| Admin | `archive/bhairava-app` | 3000 |
| Agent | `archive/bhairava-agent` | 3001 |
| Customer | `archive/bhairava-customer` | 3002 |

```bash
npm run dev:admin
npm run dev:agent
npm run dev:customer
```
