# Role access matrix (Admin · Agent · Customer)

Draft before building Agent app and Customer app.  
**✓** = full · **◐** = limited / own data · **✗** = no access

| Area | Feature | Admin | Agent | Customer | Notes |
|------|---------|:-----:|:-----:|:--------:|-------|
| Auth | Login / logout | ✓ | ✓ | ✓ | |
| Auth | Forgot / reset password | ✓ | ✓ | ✓ | |
| Inventory | View projects | ✓ | ◐ | ◐ | Agent: assigned · Customer: published |
| Inventory | Create / edit projects | ✓ | ✗ | ✗ | |
| Inventory | View plots / layout | ✓ | ◐ | ◐ | |
| Inventory | Create / edit / delete plots | ✓ | ✗ | ✗ | |
| Inventory | Plot interest / callback | ✓ | ✓ | ✓ | |
| People | Customer list (all) | ✓ | ◐ | ✗ | Agent: own leads |
| People | Create / edit customer | ✓ | ✓ | ✗ | |
| People | Own profile | ✗ | ✗ | ✓ | Customer portal |
| People | Manage agents | ✓ | ✗ | ✗ | |
| People | Own agent profile | ✗ | ✓ | ✗ | |
| Sales | Bookings list | ✓ | ◐ | ◐ | Own scope |
| Sales | Create booking | ✓ | ✓ | ✗ | |
| Sales | Update booking status | ✓ | ◐ | ✗ | Agent: early stages |
| Sales | View payments | ✓ | ◐ | ◐ | Own |
| Sales | Record / waive payment | ✓ | ✗ | ✗ | Admin / accountant |
| Legal | Documents | ✓ | ◐ | ◐ | Upload own KYC |
| Legal | Registrations | ✓ | ◐ | ◐ | View; admin manages |
| Legal | Resale | ✓ | ◐ | ◐ | |
| Ops | Dashboard / reports | ✓ | ◐ | ✗ | Agent: personal KPIs |
| Ops | Notifications | ✓ | ✓ | ✓ | |
| Ops | Follow-ups | ✓ | ✓ | ✗ | |
| Ops | Users & roles | ✓ | ✗ | ✗ | |
| Ops | Org settings | ✓ | ✗ | ✗ | |
| Ops | Audit logs | ✓ | ✗ | ✗ | |

## Proposed apps

| App | Who | Core job |
|-----|-----|----------|
| **Admin** (exists) | Office / owners | Full control |
| **Agent** (to build) | Sales agents | Sell on assigned projects |
| **Customer** (to build) | Buyers | Browse, interest, track own deal |

Edit this file when we agree on changes.
