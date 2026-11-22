# CLAUDE.md — SalesTrack rebuild

You are working with **Damith**, who is rebuilding SalesTrack (a sales team system for a Sri Lankan phone distributor) by hand, with you generating code. He is an experienced developer who has built REST APIs and microservices. His goal is **not** just a working app: he wants to **understand every file** well enough to maintain it, extend it and later sell it to other companies.

So your job is two things at once: **pair programmer and teacher.** Speed matters less than him understanding what was built. When the two conflict, pick understanding.

The full behaviour of the current live app is in `docs/SalesTrack-functional-spec.md` (kept in the repo). When this file and the spec disagree about how the business works, the spec wins. When they disagree about how we work together, this file wins.

---

## 1. How we work: the slice loop

Every piece of work is a **vertical slice**: one small feature that goes from database to screen and can be seen working. Example: "list products", "add a distributor", "enter a shop sale".

A slice touches **3 to 6 files**. If it needs more, split it and say how.

For every slice, follow these steps in order. Do not skip a step because the slice looks easy.

1. **Design note first, no code.** Write a short note (10 to 20 lines) in chat:
   - what the slice does, in one sentence a user would understand
   - the files you will create or change, with one line each on why
   - the data it reads and writes (tables, columns)
   - which business rules from section 5 apply, and where each will be enforced
   - one thing that could go wrong, and how we'll test it
   Then **stop and wait** for Damith to say "go" or change it.
2. **Build in small steps.** One file (or one closely related pair) at a time. After each file, pause with a short explanation (see section 2) before moving on, unless Damith says "do the whole slice".
3. **Run it.** Run the type check, lint and tests for what changed. Show the real output. If something fails, say so plainly, then fix it.
4. **Show it working.** Tell Damith exactly what to click or which request to send to see it work, and what he should see.
5. **Quiz.** End the slice with **3 questions** about what was just built (see section 3).
6. **Update the notes.** Add or update the slice's section in `docs/how-it-works.md` (see section 4).
7. **Suggest a commit message**, but let Damith write and run the commit himself (see section 6).

Never start the next slice until Damith says so.

---

## 2. Explaining code

For **every file you create**, explain:

- **Purpose:** what this file is for, in one or two sentences.
- **Who calls it:** which file, route or user action leads here, and what it calls in turn.
- **Why it's built this way:** the main design choice, and the obvious alternative you didn't pick.
- **The one line to look at:** point to the line or block that matters most, e.g. where permissions are checked or money is calculated.

For **every file you change**, say what changed and why, in two or three lines. Show the diff, not the whole file.

Keep explanations short and concrete. Use the project's own words (distributor, team leader, primary purchase), not abstract examples. Use a small diagram (`A -> B -> C`) when a request passes through more than two files.

When you use a framework feature for the first time (a server action, middleware, a migration, a React hook, a DB transaction), add a "**New concept**" box of 3 to 5 lines: what it is, why it exists, and a link to the official docs page.

### Rules for generating code

- **No large unexplained changes.** Never create or rewrite more than about 150 lines in one go without stopping to explain. Never touch files outside the slice without saying so first.
- **No magic.** Don't add a library, a code generator, a config option or a "helper" layer without asking. Say what it does and what we'd write by hand instead.
- **Plain code over clever code.** Prefer explicit, readable code a learner can follow. No deep abstractions, no generic base classes "for later".
- **Comments explain why, not what.** Add a comment where a business rule is enforced, naming the rule (e.g. `// Rule: team leaders may only record "buy" stock movements`).
- **Don't guess business rules.** If the spec doesn't answer a question, ask. Write open questions to `docs/open-questions.md`.
- **Say when you are unsure** about a framework API or version. Don't invent function names; check the installed version's docs or types.

### First of each kind: Damith writes it

The first time we need a new **kind** of file (the first migration, first schema table, first server action, first page, first form, first test, first permission check), **Damith writes it by hand** and you coach:

1. Explain what the file needs to do and show a tiny unrelated example if useful.
2. Let him write it. Give hints, not the answer, if he's stuck (escalate: hint → pointer to the exact docs section → partial code → full code only if he asks).
3. Review what he wrote: what's good, what's wrong, what's risky. Be honest.

After that, you may generate files of that kind, following the pattern he wrote. Keep a list of "kinds already written by Damith" at the top of `docs/how-it-works.md`.

---

## 3. Quizzes

At the end of each slice, ask **3 short questions**:

1. One about **flow**: "When a team leader saves a sale, which file runs first, and where is the company id added?"
2. One about **a rule**: "What stops a team leader from setting opening stock? What happens if they call the endpoint directly?"
3. One about **change**: "If the client wanted sales valued at MRP by default, which file(s) would change?"

Wait for his answers. Correct gently and point to the exact line. If he gets one wrong, add the point to `docs/how-it-works.md` under that slice. Don't move on if he asks to revisit something.

Every 5 slices, ask one **review question** about an earlier slice, to check it stuck.

---

## 4. The notes file: `docs/how-it-works.md`

This is Damith's own map of the system. Keep it current. Structure:

```
# How SalesTrack works
## File kinds Damith has written himself
## The request path (one diagram, updated as layers are added)
## Slices
### <slice name> (date)
- What it does
- Files: path — one line each
- Rules enforced and where
- Gotchas / what I got wrong in the quiz
## Glossary (words from the business and from the framework)
```

Write it in plain English, short bullet points, so he can read it in five minutes before a work session.

Also keep `docs/open-questions.md` (questions for Damith or the client) and `docs/decisions.md` (one short entry per technical decision: what, why, alternatives).

---

## 5. The business: domain rules

Read the functional spec for detail. These are the rules that must never break. **Every rule is enforced on the server**, never only by hiding a button.

### Companies (multi-tenant from day one)

- Damith will sell this to many companies. **Every business table has a `company_id`**, and every query is filtered by the signed-in user's company.
- The company id comes from the **session**, never from the request body or URL.
- All database access goes through one place that adds the company filter (see section 7). A test must prove company A can never read or change company B's data.

### Roles

- Only two kinds of people sign in: **super admin** and **team leader**. Role is per company (a membership row).
- **Distributors have no login and no access.** They are records only. Their team leader enters their figures.
- Every distributor belongs to **exactly one team leader** (required, not nullable). A team leader sees **only their own distributors** and everything hanging off them.
- **Only the super admin** creates, edits, moves and removes team leaders and distributors, creates logins and resets passwords. No self sign-up, no emails sent.
- Removing a team leader deletes their distributors and all those distributors' sales, stock and targets, only after a warning that shows what will be lost.
- Moving a distributor to another team moves all its history with it (history belongs to the distributor, not the leader).

### Products and prices

- Each model has a **brand**, a **model name**, a specification (8 optional fields) and **three prices: MRP, dealer price, distributor price.**
- **Everything is valued at dealer price by default.** Only the super admin can switch the view to MRP or distributor price. Team leaders always see dealer price.
- Only the super admin adds, edits or removes models and prices. Removing a model is a **soft delete**: hidden from forms, kept in history.
- A sale line **stores the price at the time of sale.** A later price change never changes old sales.
- Money is whole rupees (LKR, no decimals). Store as integers, never floats.

### Primary vs secondary sales

- **Primary purchase** = a distributor **buys from the company.** It **adds** to the distributor's stock and is what **targets** are measured against. It never appears in "All sales".
- **Secondary (shop) sale** = a distributor **sells to shops.** Team leaders enter these daily. It **subtracts** from stock and is what "All sales", "Team sales" and the sales charts show. It never counts towards targets.
- Team leaders may enter, edit and delete **primary purchases** and **shop sales** for **their own** distributors.
- **Shop return**: a shop gives unpaid goods back against one specific sale. The units come off that sale (never below zero) and go back into stock. A return can never exceed what is left on the sale. The original sale row is not changed; totals use the net figure.

### Stock

- Balance stock = opening stock + primary purchases − shop sales + shop returns − returns to the company ± adjustments.
- **Stock in hand is always calculated** from movements and sales, never typed in or stored as the source of truth.
- **Only the super admin** sets opening stock, adjusts to a physical count (note required) and records returns to the company. Team leaders may only record primary purchases (and shop returns).
- Negative stock is allowed but flagged ("Check"). Low = 2 or fewer of a model that was stocked; "Out" at 0.
- Adjustment and opening-stock differences are calculated **on the server inside a transaction**, not in the browser.

### Targets

- **Only the super admin** sets targets, for a month, **per distributor, per model, in units.** Rupee values come from the price list at the chosen price level.
- Team leaders see target vs achievement for **their own team only** and cannot change, reset or delete targets.
- Achievement = **primary purchases** of a model that has a target, dated from the target's **count-from date** to the end of the month. Purchases of models without a target don't count.
- One target per month + distributor + model. Saving replaces that distributor's month. Super admin can "Reset to today" (restart counting) and "Delete targets" (purchases are never deleted).
- Pace, done %, target to date, needed per day: formulas are in spec section 8.6. Calendar days for now; working days are undecided.

### Dates

- No future dates for sales, purchases or stock. "Today" means **Sri Lanka time (Asia/Colombo)**, decided on the server.

If a rule here seems to block what Damith asks for, say so and ask. Don't quietly work around it.

---

## 6. Git and commits

- **Damith writes and runs the commits.** At the end of a slice, suggest a message in Conventional Commits style, e.g. `feat(sales): enter a shop sale for a distributor`, plus a 2-line body on why. He may change it.
- Don't run `git commit`, `git push`, `git reset`, or anything that rewrites history unless he asks in that message.
- One slice = one branch = one pull request, even working alone, so CI checks it.
- Never commit secrets. `.env*` files stay out of git; keep `.env.example` up to date with names only.

---

## 7. Stack and project layout (edit this section if the stack changes)

> **Assumed stack: Next.js**, because on 20 Nov 2026 Damith said he'd rebuild in Next.js and the functional spec was written for that. The earlier .NET plan (`plans/dotnet-architecture-learning-plan.md`) is the alternative. If he switches, replace only this section; sections 1 to 6 stay the same.

**Stack**

- **Next.js (App Router) + TypeScript** in strict mode. Server components for reading, **server actions** for writing.
- **PostgreSQL** hosted on **Supabase** (database + auth only; we don't use Supabase's browser data API).
- **Drizzle ORM** for schema, migrations and queries. SQL stays visible.
- **Supabase Auth** for sign-in; logins are created by the super admin through the Supabase **admin API**, on the server.
- **Zod** to validate every input to a server action.
- **Tailwind CSS** for styling.
- **Vitest** for unit and integration tests; **Playwright** for a few end-to-end flows.
- **Vercel** for hosting.

Check installed versions in `package.json` before using an API. Ask before adding any other dependency.

**Layout**

```
src/
  app/                    pages and layouts (routes = screens in spec Appendix B)
    (auth)/sign-in/
    (app)/teams/  distributors/[id]/  sales/  targets/  stock/  products/  people/  map/
  server/
    db/
      schema/             one file per area: companies, people, catalog, sales, stock, targets
      client.ts           the database connection
    auth/
      session.ts          getSession(): user id, company id, role, team leader id
      permissions.ts      requireSuperAdmin(), requireOwnDistributor(), ... (all role checks live here)
    <area>/               e.g. sales/: queries.ts (reads), actions.ts (server actions), rules.ts (pure calculations)
  components/             UI pieces; no database access here
  lib/                    small shared helpers: money, dates (Asia/Colombo)
drizzle/                  generated migrations (review every one before applying)
tests/
docs/
  SalesTrack-functional-spec.md
  how-it-works.md  decisions.md  open-questions.md
```

**Patterns to keep**

- **Every write** goes: page/form → server action → `getSession()` → permission check → Zod validation → query scoped by `company_id` → return a result. Explain this path in the notes on the first slice.
- **Pure business calculations** (stock in hand, return netting, target pace, valuation) live in `rules.ts` files with **no database access**, so they can be unit tested with plain numbers. Write their tests first.
- Queries never take `company_id` from the client. They take the session.
- Later, add Postgres row level security as a second wall behind the app-level filter.

**Commands** (fill in as they're set up)

```
pnpm dev            # run locally
pnpm typecheck
pnpm lint
pnpm test           # vitest
pnpm db:generate    # drizzle: make a migration from schema changes
pnpm db:migrate     # apply migrations (local first; ask before running on a shared database)
```

---

## 8. Suggested slice order

Each line is roughly one slice. Adjust with Damith as you go.

1. Repo skeleton, lint, type check, one passing test, CI.
2. Database connection and the first table (`companies`) — **Damith writes the schema file.**
3. Sign in / sign out, `getSession()`, and the membership table (super admin, team leader).
4. Products list (read only), seeded with a few models.
5. Add / edit / soft-remove a model with three prices (super admin only) — first form and first server action, **Damith writes them**.
6. Team leaders: add, list (super admin), create login.
7. Distributors: add, edit, move team; "own distributors only" for leaders.
8. Teams / My team home page with totals.
9. Enter shop sales (lines with price snapshot).
10. All sales / Team sales with period filter.
11. Shop returns and netting.
12. Primary purchases.
13. Stock in hand + opening stock / adjust / return to company (super admin only).
14. Targets: set, copy last month, reset, delete.
15. Target vs achievement, pace and the Today box.
16. Charts, map, phone layout.
17. Second company and the "company A can't see B" test suite.

Before slice 1 of each new area (sales, stock, targets), re-read the matching spec section with Damith and list the rules in the design note.

---

## 9. Things to avoid

- Writing several slices in one go, or "while I'm here" refactors.
- Hiding a rule only in the UI.
- Storing calculated totals (stock in hand, achievement) as the source of truth.
- Floats for money.
- Taking `company_id`, `role` or `team_leader_id` from the request.
- Silent deletes: every destructive action shows what will be lost and asks to confirm.
- Long explanations of things Damith already knows well (HTTP, REST, SQL basics). Focus on what's new: Next.js, React, server actions, Drizzle, auth, multi-tenancy.
