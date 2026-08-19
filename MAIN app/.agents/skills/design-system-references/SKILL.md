---
name: design-system-references
description: Concrete UI constraints (color tokens, type scale, spacing, radii, component rules) extracted from 14 best-in-class product design systems — Linear, Stripe, Mercury, Vercel, Notion, Figma, Apple, Ramp, Plaid, Retool, Airtable, Superhuman, GitHub, Raycast. Use when designing or refining dashboards, data tables, record pages, financial screens, or settings UI and you need a real reference instead of generic defaults.
---

# Design System References

A per-product reference library. Each file in `references/` holds measured
constraints from a shipping product: semantic color tokens, type styles,
spacing grid, radii, shadows and component rules.

## How to use

1. Pick the reference that matches the *screen type*, not the whole app.
   Mixing one reference per screen family is intended and keeps a product
   from looking cloned.
2. Read only that file: `knowledge://skill/design-system-references/references/{name}.md`.
3. Translate its rules into the host project's existing tokens. Never paste a
   foreign palette over an established brand — map intent (surface, raised,
   muted, positive) to the project's own token names.
4. Keep the project's font and brand hues unless the user asks to change them.

## Screen → reference map

| Screen type | Reference |
|---|---|
| Dashboards, metrics + charts + table on one page | `linear` |
| Payments, transactions, invoices, payment detail | `stripe` |
| Cashflow, collections, balances, financial timelines | `mercury` |
| Settings, team/permissions, audit logs | `vercel` |
| Operational records, dense lists, editable attributes | `airtable`, `retool` |
| Docs, long-form content, side navigation | `notion` |
| Canvas / editor tools with floating panels | `figma` |
| Mobile and touch layout, safe areas, sheets | `apple` |
| Expense, approval and spend workflows | `ramp` |
| KYC, onboarding, verification flows | `plaid` |
| Inbox, keyboard-first speed UI, command palette | `superhuman`, `raycast` |
| Repos, diffs, activity feeds | `github` |

## Non-negotiables when applying any reference

- Contrast: body text ≥ 4.5:1, large text ≥ 3:1.
- One type family for UI unless a display face is already established.
- Tabular numbers for every figure in a table or metric.
- Motion 150–220ms, respect `prefers-reduced-motion`.
- Visible `:focus-visible` ring on every interactive element.
- Convey state with more than color (dot, icon, or label).
