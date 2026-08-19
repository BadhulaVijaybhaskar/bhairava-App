# Agent & Customer portal access

## Agent (`:3001`)

| Capability | Allowed |
|---|---|
| View assigned projects, layouts, plots, statuses | Yes |
| View customers linked via own bookings or created by agent | Yes |
| **Add** customers under agent | Yes |
| **Delete** customers | **No** |
| Create booking / reserve plot for customer | Yes |
| View documents for own customers | Yes (view) |
| Admin modules (users, settings, audit, reports export) | No |

## Customer (`:3002`)

| Capability | Allowed |
|---|---|
| View all active projects | Yes |
| View plot details & layout status colours | Yes |
| See **other** buyers’ names / phones on reserved/sold plots | **No** |
| Own plot, bookings, payments, documents, profile | Yes only |
| Add / delete customers | No |

Privacy rule: customer layout & plot list show **status only** for others; never `assignedCustomer` PII unless the plot is theirs (`assignedCustomerId === session.customerId`).
