# SalesTrack

A sales-tracking system for a Sri Lankan phone distribution company. The company sells
phones (brands: **HotWav, Lebest, Meizu, Ulefone, Philips** — more can be added) to
**distributors**, who sell on to **retail shops**. **Team leaders** manage groups of
distributors and enter their figures; distributors themselves do not use the system.

This repository is a from-scratch rebuild target. The authoritative description of behaviour
is [`docs/functional-spec.md`](docs/functional-spec.md) — the functional specification of the
live system (salestrack-teams-demo.vercel.app) as of **20 November 2026**. This README is the
quick orientation; the spec is the source of truth.

---

## The business in one page

- **Primary sale (primary purchase)** — a distributor buys phones from the company. Adds to
  the distributor's stock and is what **monthly targets** are measured against.
- **Secondary sale (shop sale)** — a distributor sells phones to shops. Team leaders enter
  these daily. They remove stock and are what the sales reports/charts show.
- **Shop return** — a shop returns unpaid goods against a specific sale. Units come off that
  sale and go back into the distributor's stock.
- **Balance stock** = opening stock + primary purchases − shop sales + shop returns
  − returns to company ± adjustments.
- **Targets** — on the 1st of each month the super admin sets, per distributor and per model,
  how many units the distributor should buy from the company that month.
- **Three price levels** — MRP, dealer price, distributor price. Everything is valued at
  **dealer price** unless the super admin selects MRP or distributor price.

## Roles

Only two kinds of people sign in. There is no self sign-up and no email sending.

| Role | Sees | Can do |
| --- | --- | --- |
| **Super admin** | Everything, all teams | Manage team leaders, distributors, models/prices, targets; enter/delete any sale; opening stock, adjustments, returns to company; map; People page |
| **Team leader** | Own team only | Enter/delete shop sales and primary purchases for own distributors; shop returns; set device map pin |
| **Distributor** | — | No login. A record only, always belonging to exactly one team leader |

Every rule should be enforced **server-side** in the rebuild. In the live system some rules are
UI-only (see the spec's section 11, Known gaps).

## Core entities

| Entity | Notes |
| --- | --- |
| **Profile** | A person who can sign in: super admin or team leader |
| **Distributor** | Belongs to exactly one team leader; no login |
| **Product** | A phone model of one brand, with MRP / dealer / distributor prices and a spec |
| **Sales entry** | One secondary (shop) sale: distributor, date, shops, invoices, and lines of model × units × dealer price |
| **Stock movement** | kind = `in` (opening), `buy` (primary purchase), `return` (to company, negative), `count` (adjustment), `shopret` (shop return) |
| **Target** | Units of one model, one distributor, one month, with a "count-from" date |

Stock in hand, achievement, totals and pace are **never stored** — they are always calculated
from movements and sales.

## Key calculations

- **Stock in hand** = opening + primary bought − returned to company + adjustments − net units
  sold since the first stock movement. Negative stock is allowed and flagged (`Out` / `Low` /
  `Check`).
- **Shop returns (netting)** — a sale keeps its original "gross" lines; returns are subtracted
  per model to give the **net** sale used for every total, chart and stock figure.
- **Targets** — achievement counts only primary purchases of the target's model, by that
  distributor, from the count-from date to month end. `Done %` = achieved ÷ month target;
  `Pace` = achieved ÷ target due by today (green ≥ 100%, amber 80–99%, red < 80%).
- **Valuation** — shop sales use the dealer price stored on the line (history is stable);
  primary purchases, targets and stock use the model's current price for the chosen basis.

See the spec's section 8 for the full set of formulas.

## Screens

Teams / My team · Distributor page · Enter sales · All sales / Team sales · Shop return ·
Targets · Set targets · Stock · Record stock · Map (super admin) · People (super admin) ·
Products / Models · Change password. Full route list is in the spec's Appendix B.

## Suggested data model for the rebuild

The live schema has known gaps (JSON sale lines with no foreign keys, brand as free text,
browser-side stock calculation, UI-only permissions). Appendix A of the spec proposes a cleaner
model: real `ShopSaleLine` / `PrimaryPurchase` / `ShopReturn` entities with price snapshots, a
`Brand` table, server-side stock balances, and an `AuditLog`. If selling to multiple companies,
add a tenant/company to every row.

## Status & known gaps

The live site is the old app patched in the browser by several layers; the functional spec — not
any single source file — is the complete description of its behaviour. Section 11 of the spec
lists the security, consistency and data-model gaps to decide on during the rebuild, including:

- A stock-permission SQL rule was never applied; team leaders can write any stock kind at the DB
  level today. Rebuild should allow leaders **`buy` + `shopret` only**, server-side.
- No way to edit a shop sale (delete and re-enter).
- Primary purchases, targets and stock are revalued when a price changes (no snapshot).
- No invoice/shop entity; no brands table; sale lines are JSON.
- "Today" is the device's local date, not Sri Lanka time.

## Documentation

- [`docs/functional-spec.md`](docs/functional-spec.md) — the full functional specification
  (what the user sees, what is stored, how numbers are calculated, who may do what).

---

*Prepared for Damith · 20 November 2026.*
