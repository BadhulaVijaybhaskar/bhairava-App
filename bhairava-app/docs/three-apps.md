# Three Next.js hosts (future: three mobile apps)

| Host | Port | App | Roles |
|------|------|-----|-------|
| Admin | 3000 | `bhairava-app` | ADMIN |
| Agent | 3001 | `bhairava-agent` | SALES_AGENT, SALES_MANAGER |
| Customer | 3002 | `bhairava-customer` | CUSTOMER |

Auth cookies are namespaced per host so sessions do not collide on localhost.

See workspace root `README.md` for run commands and demo logins.
