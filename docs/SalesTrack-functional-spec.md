# SalesTrack

Functional specification of the current live system

Prepared for Damith · 20 November 2026 · describes the app live at salestrack-teams-demo.vercel.app on that date

# 1. About this document

This document describes **what SalesTrack does today**, screen by screen and rule by rule, so it can be rebuilt from scratch (for example in Next.js) without reading the old code. It is functional, not an implementation guide: it says what the user sees, what the system stores, how numbers are calculated and who may do what. Where the current behaviour is odd or inconsistent, it says so in section 11 rather than hiding it, so you can decide whether to copy it or fix it.

It was written from the live code (the deploy-stock package: app-core.js plus the brands, stock, targets, primary, charts and stockctl layers, in the order index.html loads them), the SQL in salestrack-v3/schema.sql and sql-team-rules/1 to 10, the project README, the targets plan, and the business decisions recorded with the client up to 20 November 2026.

### Contents

1. About this document
2. The business in one page
3. Glossary
4. Roles and permissions
5. Layout and navigation (desktop and mobile)
6. Screens and actions
7. Data entities and relationships
8. Business rules and calculations
9. Validations
10. Ownership, consistency and deletion cascades
11. Known gaps and inconsistencies
12. Reports and charts (summary)
13. Appendix A: current tables mapped to a suggested Next.js data model
14. Appendix B: route list

# 2. The business in one page

The client is a Sri Lankan phone distribution company selling the brands HotWav, Lebest, Meizu, Ulefone and Philips (the super admin can add more). The company sells to **distributors**; distributors sell on to **retail shops**. The company has **team leaders**, each responsible for a group of distributors. Distributors do not use the system: their team leader enters their figures.

- **Primary sale (primary purchase):** a distributor buys phones from the company. It adds to the distributor's stock and is what **monthly targets** are measured against.
- **Secondary sale (shop sale):** a distributor sells phones to shops. Team leaders enter these daily on "Enter sales". They take stock away from the distributor and are what "All sales" / "Team sales" and the sales charts show.
- **Shop return:** a shop gives unpaid goods back against a specific sale. The units come off that sale and go back into the distributor's stock.
- **Balance stock:** opening stock + primary purchases − shop sales + shop returns − returns to the company ± adjustments.
- **Targets:** on the 1st of each month the super admin sets, per distributor and per model, how many units the distributor should buy from the company that month. Rupee values come from the price list.
- **Three price levels:** MRP, dealer price and distributor price. Everything is valued at **dealer price** unless the super admin ticks MRP or distributor price on screen.

# 3. Glossary

| **Term** | **Meaning in SalesTrack** |
| --- | --- |
| Super admin | The company owner/manager account. Sees and manages everything. (Live: Anjana Mahagedare.) |
| Team leader | A sales manager with a login. Sees only their own distributors. |
| Distributor | A business that buys from the company and sells to shops. A record only, with no login. Always belongs to exactly one team leader. |
| Team | A team leader plus the distributors assigned to them. |
| Model / product | A phone model of one brand, with three prices and a specification. |
| Sales entry | One saved secondary sale: one distributor, one date, shops covered, invoice count, and lines of model × units × dealer price. |
| Primary purchase | Stock movement of kind "buy": units of one model a distributor bought from the company on a date. |
| Opening stock | Stock movement of kind "in": the distributor's starting stock of a model. |
| Adjustment | Stock movement of kind "count": the difference between the calculated stock and a physical count. |
| Returned to company | Stock movement of kind "return": units the distributor sent back to the company (stored as a negative number). |
| Shop return | Stock movement of kind "shopret", linked to one sales entry: units a shop gave back. |
| Count from date | start_date on a target: purchases count only from this day to the end of the month. |
| Done % | Achieved ÷ the whole month's target. |
| Pace | Achieved ÷ the target due by today (green ≥ 100%, amber 80–99%, red < 80%). |
| Price basis | Which price level rupee figures use: dealer (default), MRP or distributor price. |

# 4. Roles and permissions

Only two kinds of people sign in: the **super admin** and **team leaders**. Distributors never sign in. There is no self sign-up and no email sending; the super admin creates logins and hands out passwords.

## 4.1 Permission matrix

The last column says where the rule is enforced today. "DB" means the database refuses it (row level security, a trigger or a function check); "UI only" means only the screens prevent it, and a team leader calling the API directly could still do it. Your rebuild should enforce every rule on the server.

| **Action** | **Super admin** | **Team leader** | **Enforced** |
| --- | --- | --- | --- |
| Sign in, change own password | Yes | Yes | DB |
| See teams, distributors, sales, stock, targets | All teams | Own team only | DB |
| Add a team leader, create login, reset password | Yes | No | DB |
| Remove a team leader (deletes their distributors and data, blocks login) | Yes | No | DB |
| Add, edit, remove a distributor | Yes | No | DB |
| Move a distributor to another team | Yes | No | DB |
| Set a distributor's map pin (GPS of the device) | Yes | Own distributors | DB (trigger allows only lat/lng) |
| Add, edit, remove models and prices; add a brand | Yes | No (read only) | DB |
| Enter shop sales | Any distributor (from its page) | Own distributors (menu) | DB |
| Delete a shop sales entry | Yes | Own distributors | DB |
| Edit a shop sales entry | Not possible in the app | Not possible in the app | n/a |
| Record / delete a shop return | Yes | Own distributors | DB |
| Record a primary purchase | Yes | Own distributors (since 20 Nov 2026) | DB allows |
| Edit / delete a primary purchase (target card) | Yes | Own distributors | DB allows |
| Set opening stock, adjust to a count, record return to company | Yes | No | UI only |
| Delete stock history rows other than shop returns | Yes | No | UI only |
| Set, copy, clear, reset or delete targets | Yes | No (read only) | DB |
| See target vs achievement | All, by team / distributor / model | Own team, by distributor / model | DB |
| Tick MRP / distributor price to revalue | Yes | No (always dealer) | UI |
| See the map | Yes | No | UI |
| See the People page | Yes | No | UI + DB |

## 4.2 Rules behind the roles (client decisions)

- Only the super admin creates team leaders and distributors (22 Oct 2026). Team leaders cannot add or delete distributors.
- No distributor may exist without a team leader. Deleting a team leader deletes their distributors and those distributors' sales, stock and targets, after an explicit warning.
- Only the super admin enters targets, on the 1st, by model, in units. Team leaders see their own team's target vs achievement but cannot change targets.
- Team leaders upload shop sales daily for all their own distributors.
- Team leaders may enter, edit and delete primary purchases for their own distributors (20 Nov 2026). Opening stock, adjustments and returns to the company stay with the super admin.
- Team leaders may delete their own mistaken entries (shop sales, primary purchases) but cannot reset or delete targets.
- Distributors need no target view and no access at all.

# 5. Layout and navigation

## 5.1 Desktop (wide screens)

- A dark **left side column** with the SalesTrack logo, the main menu, the **Today box** (see 6.17) and, at the bottom, the signed-in person's name, role and region, a "Change password" link and "Sign out".
- The page content sits to the right. Pages start with a heading, a one-line explanation and the page's buttons and switches on the right.
- Tables show all columns.

## 5.2 Mobile (phones)

- The side column is replaced by a **top bar** (logo, first name · role, "Password" and "Sign out") and a **bottom tab bar** with the same menu items as icons with labels.
- The Today box moves to the top of the Teams / My team page.
- Tables hide secondary columns (marked "desktop only" in section 6) so the key figures fit. Rows stay tappable.
- Forms (Enter sales, Record stock, Set targets, Shop return) have a **sticky footer** with the running total and the Save button.
- Number boxes open the numeric keypad. Quantities are typeable everywhere; the sale form also has − and + buttons.

## 5.3 Menus

| **Super admin menu** | **Team leader menu** |
| --- | --- |
| Teams | My team |
| All sales | Enter sales |
| Targets | Team sales |
| Stock | Targets |
| Map | Stock |
| People | Models |
| Products |   |

Opening a page that the role may not use, or an unknown address, sends the user to the first menu item. Sub-pages (a distributor, Add distributor, Set targets, Record stock, Shop return) highlight their parent menu item.

## 5.4 Behaviour common to all pages

- All data the user may see is loaded once at sign-in into the browser. Saves update the screen immediately and are sent to the server in the background. If a save fails, a message "Not saved: <reason>" appears and all data is reloaded from the server.
- Short confirmation messages ("toasts") appear at the bottom for about 2.6 seconds, e.g. "Sales saved for Dilshan Silva".
- When the user comes back to the browser tab after more than 30 seconds, data reloads automatically, unless they are in the middle of a form or an edit.
- Dates show as "Today", "Yesterday" or e.g. "Thu 20 Nov". Rupees show as "LKR 1,234,567" with no decimals.
- Brands have fixed colours: HotWav red, Lebest blue, Meizu white (outlined), Ulefone yellow, Philips light green; any other brand grey. Team leaders get a colour each (blue, amber, purple, teal, pink, cyan in order) used on avatars and map pins.
- Destructive actions on targets and counted purchases need a **second tap** ("Tap again to delete"). Some other deletes do not (see section 11).

# 6. Screens and actions

For each screen: who can open it, what it shows, what the user can do, and how it differs on a phone.

## 6.1 Sign in

- Fields: email, password. Text: "For the super admin and team leaders. Distributors do not sign in."
- Errors: empty fields → "Type your email and password."; wrong details → "Wrong email or password."
- Note under the form: "Forgot your password? Ask the super admin to set a new one for you." (no self-service reset).
- The session is kept in the browser and refreshed automatically before it expires. If the account has no profile (not the super admin or a team leader), the app shows "This account has no access to SalesTrack" with a Sign out button.
- Signing out resets all filters and the price basis.

## 6.2 Change password (both roles)

- New password and "Type it again". At least 8 characters; both must match. On success: "Password changed" and back to Teams.

## 6.3 Teams (super admin) / My team (team leader)

The home page.

- **Controls:** period switch (Today, Last 7 days, This month, All, Pick dates; see 6.18) and, for the super admin, the price ticks. Buttons: super admin "+ Add team leader" and "+ Add distributor"; team leader "+ Enter sales".
- **KPI tiles, super admin:** Total sales · <price level>, Team leaders, Distributors, Units sold, Invoices.
- **KPI tiles, team leader:** Team sales · Dealer price, Distributors, Units sold, Invoices, "Entered today: N of M" (distributors whose latest sales entry is today).
- A brand colour legend.
- **One card per team leader** (a leader sees only their own card, always open). The header shows avatar, name, region · district, number of distributors, units, invoices, total value and (super admin) % of all sales. The super admin can open and close cards; the first one is open by default.
- Inside each card, a table of distributors: name with business and town · district, last entry date (or "No sales yet"), invoices, units, value, share of the team, and a brand bar (coloured segments by sales value per brand). Tapping a row opens the distributor page.
- Super admin: "+ Add distributor to <name>'s team" under each card. Distributors whose team leader is missing appear in a grey "No team leader" card.
- **Phone:** only distributor name and value columns stay visible; the Today box sits above the tiles.

## 6.4 Distributor page

Opened by tapping a distributor anywhere. A team leader can only open their own distributors.

- **Header:** avatar, name, "Distributor · Town · District · <leader>'s team". Buttons: "Edit details" (super admin only) and "+ Enter sales".
- **Details card:** Business, Phone (tap to call), Town, District, Address, Team leader, Location on map with "Set to where I am now" / "Update to where I am now" (uses the phone's GPS; both roles).
- **Edit mode (super admin):** the same fields as Add distributor plus Team leader; buttons Remove distributor, Cancel, Save. Changing the town clears the saved map pin.
- **Target card for the current month** (see 6.4.1).
- **Stock in hand card** (see 6.4.2).
- **Sales section:** period switch, KPI tiles (Sales value, Units, Invoices, Shops covered, Last entry), brand bar, and a table of this distributor's shop sales entries, newest first: date, shops, invoices, units, value, entered by. Tapping a row expands it to show each model line (model, brand badge, "n returned" pill if shops gave units back, units × price = value) and a summary line (shops covered, invoices, units returned by shops). Buttons in the expanded row: "Record a shop return" and "Delete this entry" (deletes immediately).

### 6.4.1 Target card on the distributor page

- Title "Target · <current month>", with "Counting primary purchases from <date>" when targets started after the 1st.
- Buttons: "+ Primary purchase" (both roles); super admin also "Reset to today" (current month, after the 1st), "Delete targets", and "Set targets" / "Edit targets".
- If no target: "No target set for <name> this month."
- KPI tiles (see 8.6) and a per-model table: model, target units, bought, progress bar, Done %, still to buy.
- **"Primary purchases counted towards this target":** the purchases this month that count (model with a target, dated on or after its count-from date), newest first: date, model and note, units, value, entered by, and Edit / Delete buttons. Delete needs a second tap.
- **Edit primary purchase** (inline form): model (any live model), units, date (not in the future), optional note. Saving updates the row and appends to its note: "Edited <date> by <first name>: was <qty> × <model> on <date>". "Nothing changed" if model, units and date are the same.

### 6.4.2 Stock card on the distributor page

- Title "Stock in hand", "Counted from <date>, the first stock entry".
- Buttons: "+ Primary purchase" (both roles); super admin also "Set opening stock".
- If no stock is recorded yet: "No stock recorded … Tap Set opening stock to start." (team leader: "The super admin sets the opening stock.").
- KPI tiles: Units in hand, Value · price level, Models in hand, Low or out.
- Per-model table: model with Low / Out / Check pill and brand; Opening / given; Primary bought; Returned / corrected (e.g. "−2 / +1"); Sold (shop sales net of shop returns); In hand; value. Super admin gets an "Adjust" button next to each In hand number.
- "Show stock history (N)" lists every movement newest first: date, what (Opening stock, Primary purchase, Returned to company, Adjustment, Shop return) with note, model, ± units, entered by, and Delete. Super admin can delete any row; team leaders only shop return rows. Deletes are immediate.
- Phone: only Model and In hand columns.

## 6.5 Add distributor (super admin)

- Fields: Name (required), Business name, Phone, Town (free text with suggestions), District (one of the 25 districts grouped by province), Address, Team leader (required).
- Typing a town that is also a district name selects that district automatically.
- Can be pre-filled with a team leader when opened from a team card. If no team leader exists yet: "Every distributor belongs to a team leader. Add a team leader first."
- Saving opens the new distributor's page.

## 6.6 Enter sales (shop sales)

Team leader: from the menu. Super admin: only via "+ Enter sales" on a distributor page.

- Distributor (only the user's own distributors), Date (today by default, no future dates).
- A yellow warning if this distributor already has an entry on that date: "Saving adds a second entry." (allowed).
- Shops covered and Invoices (whole numbers, optional, default 0).
- "Find a model" search box (matches brand + model text). Without a search, brand tabs with the brand colour dot and the count of units chosen per brand.
- One row per live (not removed) model: model, dealer price, "N in stock" for that distributor when stock is tracked, and a red "more than in stock" warning if more is entered than is in stock (warning only, not blocked). Quantity: type the number or use − / +.
- Sticky footer: "N units" and the total at dealer price; "Save sales" is disabled until at least one unit is entered.
- On save each line stores the model, units and the **current dealer price**. The user goes to the distributor page.
- Empty states: no distributors ("The super admin adds them"), no models.

## 6.7 All sales (super admin) / Team sales (team leader)

- Shop (secondary) sales only. Note at the bottom: "Primary purchases are under Targets."
- Heading line: "N entries · units · LKR value", "· <Brand> models only" when a brand filter is on, and the period label.
- Filters: period switch with Pick dates, price ticks (super admin), Team (super admin), Distributor, Brand. Choosing a team resets the distributor filter.
- **Brand filter counts only that brand's lines** of each entry (not whole entries).
- Charts (see section 12): Shop sales trend, Top models, By brand.
- Table, newest first: date, distributor with town, entered by (super admin), invoices, units, value. Tap to expand the lines, with "Record a shop return". There is no delete here (delete is on the distributor page).
- Team leader also gets "+ Enter sales".
- Phone: date, distributor and value only.

## 6.8 Shop return

Opened from an expanded sale. Both roles, for distributors they can see.

- Explains: "Goods a shop gave back on the sale of <date> (N shops · N invoices). The units go back into <distributor>'s stock and come off that day's sales."
- Date of return (between the sale date and today) and "Invoice / shop" free text (stored as the note; there is no invoice table).
- One row per model on the sale: "Sold N · M already returned · up to K can come back", with a number box, or "All back" when nothing is left.
- List of returns already recorded on this sale with Delete (immediate).
- Save checks no model returns more than what is left: "Only K of <model> can come back". Needs at least one unit.

## 6.9 Targets

- Both roles. Heading explains that achievement = primary purchases (what distributors bought from the company).
- Controls: month navigation (‹ Month Year ›, any month), price ticks (super admin), "Set targets" (super admin), "+ Primary purchase" (both roles).
- If no targets for the month: "No targets set for <month> yet."
- KPI tiles (see 8.6) and the **Primary purchases vs target** chart (section 12).
- View switch: **By team leader** (super admin only, default for super admin), **By distributor** (default for team leaders), **By model**. Super admin team filter; in By model, a distributor filter.
- By team leader / By distributor columns: Target (value and units, or "Not set"), Achieved (value and units), progress bar, Done %, Pace (or "Result" for past months). Tapping a team leader filters to that team in By distributor. Super admin gets "Set" / "Edit" per distributor.
- By model columns: Model with brand badge, Target units, Bought, Target value, Achieved value, Done, Pace, Still to buy.
- Explanatory note at the bottom about Done, Pace and counting rules.
- Phone: progress bar, Done and some value columns hidden.

## 6.10 Set targets (super admin)

- Distributor picker (shows "<leader>'s team") and Month picker.
- Buttons: "Copy <previous month>'s targets" (loads last month's units; "No targets last month for this distributor" if none; nothing saved until Save), "Clear all", and when targets exist, "Reset to today" and "Delete targets" (second tap).
- Note "Primary purchases are counted from <date>" when the count-from date is after the 1st.
- Model search and brand tabs with units chosen per brand; one unit box per live model with its dealer price. Empty = no target.
- Sticky footer: "N units for <first name> · <month>" and the value at dealer price. "Save targets".
- Save rules: see 8.7. Afterwards the Targets page opens on that month.

## 6.11 Stock

- Heading: balance stock = opening + primary purchases − shop sales since the first stock entry, + shop returns.
- Buttons: "+ Primary purchase" (both roles), "Set opening stock" (super admin), price ticks (super admin), team filter (super admin).
- KPI tiles: Units in hand, Stock value · price level, "Distributors with stock N of M", Models low or out.
- **By distributor** table: distributor, team leader (super admin), models, units in hand, value, low stock pill ("N low") or OK, or "No stock recorded". Tap to open the distributor.
- **By model** table across the shown distributors: brand, model, units in hand, value, distributors holding it, number of distributors low on it.
- Note: "Low" = 2 or fewer of a model the distributor was given; "Check" = more sold than given.

## 6.12 Record stock form (Primary purchase, Opening stock, Adjust, Returned to company)

One form with a type switch. Team leaders only ever get "Primary purchase". The super admin gets Primary purchase, Opening stock, Adjust to real count and Returned to company.

- Fields: Distributor (own only for leaders), Date (no future), Note (optional, **required for Adjust**), model search, brand tabs, one number box per live model showing "N in hand now" or "No stock recorded yet".
- **Primary purchase:** each typed number becomes one "buy" row. Help text: added to balance stock, counts towards the target, never shows in All sales.
- **Opening stock:** the number typed **replaces** the opening figure for that model. The box shows the current opening figure greyed out. The system saves the difference as a new "in" row (can be negative). Empty = keep.
- **Adjust to real count:** type the physical count; the system saves count − calculated in hand as an adjustment row. Opened from "Adjust" it jumps straight to that model.
- **Returned to company:** typed units are saved as negative "return" rows.
- Nothing typed → "Type how many units first"; Opening/Adjust with no change → "Nothing changed: the numbers match".
- After saving, the distributor page opens.

## 6.13 Map (super admin)

- OpenStreetMap with one round pin per distributor in the team colour with initials. Position = saved pin, else the town's known coordinates, else the district capital. Popup: name, business, town · district ("approximate, no pin yet" when no pin), team, units and value for the period, link "Open".
- Side list of distributors; tapping one zooms to it. Legend of team colours. Period switch affects popup figures.
- Grey dots are demo retail shops from seed data (not real data).

## 6.14 People (super admin)

- "Add a team leader" inline form: full name (required), phone, region, login email (optional), password (8+ if email given), base town (list), district.
- Team leaders table: name, email or "No login yet", phone, region · district, number of distributors, buttons "Create login" / "Reset password" and "Remove".
- Create login asks for an email and a password; Reset password asks for a new password. No email is sent.
- Remove shows a red warning: how many distributors (named) and how many sales entries worth how much will be deleted, that the person can no longer sign in, and that it cannot be undone, with a hint to move distributors first. Buttons: "Delete <name> and their team" / Cancel.
- Distributors table with a Team leader drop-down per distributor. Changing it moves the distributor at once ("<name> moved to <leader>'s team").
- "+ Add distributor" button.

## 6.15 Add team leader page (super admin)

- Same fields as the inline form, as a full page from Teams. After saving, Teams opens with the new leader's card open.

## 6.16 Products and prices (super admin) / Models (team leader)

- Table grouped by brand order: Brand badge, Model, Specification (View / Hide), MRP, Dealer, Distributor. Phone: model, specification button and dealer price.
- Expanding shows the three prices and eight specification fields (RAM / storage, Display, Processor, Camera, Battery, Android version, Colours, Warranty), "Not added yet" when empty.
- **Super admin:** "+ Add model" (brand with "+ New brand…", model name, three prices, specification); "Edit prices and specification" (also brand and name) with "Remove this model" (second tap); "Remove all models" (with a warning card) and "Bring back removed models (N)".
- Notes: a new price applies to new sales only; removing a model hides it from Products and sale entry, past sales stay.
- Team leaders see the same list read-only.

## 6.17 The Today box

- Desktop: in the side column. Phone: top of the Teams page. Tapping opens Targets.
- Shows for the current month, for all teams (super admin) or the leader's team: Target for today, Bought today with % of today's target and a bar, "Month so far: X% of target" (pace), "To buy per day".
- If no targets this month: "No targets set for <Month> yet." (super admin: "Tap to set them.").

## 6.18 Common controls

- **Period switch** on Teams, distributor page, All sales and Map: Today, Last 7 days, This month (1st to today), All (default), and "📅 Pick dates" which opens a panel with From and To dates plus quick buttons Yesterday, Last week (Monday to Sunday), Last month, Last 30 days. If From is after To they are swapped. The chosen period is shared across these pages until sign out.
- **Price ticks** (super admin only): MRP, Dealer price, Distributor price. One is active; rupee figures everywhere recalculate. Team leaders always see dealer price.
- **Brand tabs and model search** on every model-picking form; searching hides the tabs and searches all brands.

# 7. Data entities and relationships

All IDs are short text keys made by the app (a letter prefix plus time and random characters), not UUIDs. Every table records who created a row (entered_by / set_by) where relevant, and a created time.

## 7.1 Entities

| **Entity (table)** | **Fields and meaning** |
| --- | --- |
| Profile (st_profiles) | A person who can sign in. id, email (unique, links to the login; empty until a login is created), name, role (super \| leader), phone, area (= town), region (free text), district. |
| Distributor (st_distributors) | id, name, biz (business name), phone, area (town), district, address, leader_id → Profile, lat, lng (map pin). |
| Product (st_products) | id, brand (free text), model, price (dealer, required), mrp, dist (distributor price), spec (8 optional text fields), removed (soft delete flag). |
| Sales entry (st_sales) | id, sale_date, rep → Distributor, entered_by → Profile, shops (count), invoices (count), lines = list of [product id, units, dealer price at the time of the sale]. |
| Stock movement (st_stock) | id, move_date, dist → Distributor, product → Product, qty (never 0), kind (in \| buy \| return \| count \| shopret), note, entered_by, sale_id → Sales entry (shop returns only). |
| Target (st_targets) | id (t<YYYYMM>_<dist>_<product>), month (always the 1st), dist → Distributor, product → Product, qty (> 0 units), start_date ("count from", inside the month), set_by, updated_at. Unique per month + distributor + product. |
| Login (Supabase auth user) | Email and password hash. Linked to a Profile by email. A removed leader's login is banned; it can be reused if the same email is given to a new leader. |

## 7.2 Relationships

- A team leader (Profile) has many Distributors. A Distributor has exactly one team leader.
- A Distributor has many Sales entries, Stock movements and Targets.
- A Sales entry has many lines; each line refers to a Product (inside the JSON, no foreign key).
- A Stock movement refers to one Product; a shop return also refers to one Sales entry.
- A Target refers to one Product and one Distributor for one month.
- Brands are not an entity: a brand exists while at least one Product uses it (plus the five built-in brands).
- Nothing is stored for stock in hand, achievement, totals or pace: all are calculated (section 8).

# 8. Business rules and calculations

## 8.1 Price levels and valuation

- Each model has MRP, dealer price and distributor price. Dealer price is required.
- When adding a model, empty MRP defaults to dealer × 1.15 and empty distributor price to dealer × 0.94, both rounded to the nearest 50. (These are sample ratios; the client's real MRP and distributor prices are still awaited.)
- **Shop sale value** = Σ units × unit price. At dealer basis the unit price is the dealer price **stored on the line** at the time of the sale, so later price changes do not change history. At MRP or distributor basis the **current** MRP / distributor price of the model is used (falls back to the stored dealer price if missing).
- **Primary purchases, targets and stock** are valued at the model's **current** price for the chosen basis (they store no price).
- Totals and brand shares are always added up line by line.

## 8.2 Primary vs secondary

- Primary purchases are stock movements of kind "buy". They add to stock, count towards targets, and never appear in All sales / Team sales or the sales charts.
- Secondary (shop) sales are Sales entries. They reduce stock and are what Teams, distributor sales and All sales show. They do not count towards targets.
- Historic note: before 18 Nov 2026 some primary purchases had been entered as shop sales; those were moved to "buy" rows (backup kept in st_sales_backup_20261118).

## 8.3 Shop returns (netting)

A sale keeps its original lines ("gross"). For each sale, the shop returns linked to it are added up per model, and taken off that model's lines in order, never below zero. What is left is the **net** sale used for every total, chart and stock figure. The sale row itself is never changed. Deleting a return puts the units back on the sale; deleting the sale deletes its returns.

## 8.4 Stock in hand

- Calculated per distributor and model from that distributor's stock movements (all kinds except shop returns, which work through the sale) and their net shop sales.
- **Start date** = the date of the distributor's first stock movement. Shop sales before it are ignored. If a distributor has no movement, stock is "not recorded".
- **In hand = opening/given + primary bought − returned to company + adjustments − net units sold since the start date.**
- **Low** = the model was ever stocked (given + bought + adjustments > 0) and in hand ≤ 2. Label: "Out" at 0, "Check" below 0, else "Low". Negative stock is allowed and only flagged.
- Value = in hand × current price at the chosen basis. "Models in hand" counts models with more than 0.
- **Opening stock replace:** new "in" row = typed figure − sum of existing "in" rows for that model.
- **Adjustment:** new "count" row = typed count − current calculated in hand. A note is required.
- **Returned to company:** "return" row with −units.

## 8.5 Targets: what counts

- A target = units of one model for one distributor for one month. Rupee target = units × current price at the basis.
- Each target has a **count-from date** (start_date). Only primary purchases of **that model**, by **that distributor**, dated from the count-from date to the end of the month count. Purchases of models with no target do not count.
- Days in month = calendar days (working days are deliberately not used yet).
- For one target: span = days from its count-from date to month end, inclusive; elapsed = days from count-from date to today inclusive (whole span for past months, 0 for future months, capped at the span).

## 8.6 Targets: the numbers

| **Figure** | **Calculation** |
| --- | --- |
| Month target (units / LKR) | Σ target units; LKR = Σ units × price. |
| Achieved | Σ counted primary purchase units; LKR at the basis. |
| Done % | Achieved LKR ÷ month target LKR (per model: units ÷ units). |
| Target to date | Σ target units × elapsed ÷ span, valued at the basis. |
| Pace | Achieved ÷ target to date. If target to date is 0 (e.g. future month) it shows Done % instead. Colours: green ≥ 100%, amber 80–99%, red < 80%. Per model: units bought ÷ units due to date. |
| Today's target | For the current month, Σ target units ÷ span for targets whose count-from date is today or earlier. |
| Bought today / Today % | Counted purchases dated today ÷ today's target. |
| Days left | Current month: days remaining including today. Future month: all days. Past month: 0. |
| Still needed | Month target − achieved before today (current month) or − achieved (other months), never below 0. |
| Needed per day ("To buy per day") | Still needed ÷ days left. |
| Still to buy (per model) | Target units − bought, never below 0. |

KPI tiles on Targets and the target card: Month target, Achieved (primary), Target to date; then for the current month Today and Needed per day; for other months Days in month (with "month over" / "not started") and Units bought.

## 8.7 Saving, copying, resetting and deleting targets

- Save replaces the distributor's targets for that month: models with a number > 0 are upserted; models that had a target and are now empty are deleted.
- An existing model target **keeps its count-from date**. A new one gets today if the month is the current month and today is after the 1st, otherwise the 1st of the month.
- **Copy last month** loads the previous month's units into the form only.
- **Reset to today** (current month only, super admin, second tap): sets the count-from date of all that distributor's targets for the month to today. Targets stay; achievement restarts from 0.
- **Delete targets** (super admin, second tap): deletes that distributor's targets for that month. Purchases are never deleted by this.

## 8.8 Periods

- Today = sale date is today; Last 7 days = today and the 6 days before; This month = from the 1st to today; Pick dates = From to To inclusive; All = no limit. Periods filter shop sales only (Teams, distributor sales, All sales, Map). Targets use their own month navigation. Stock ignores periods.

## 8.9 Other rules

- A sale date, stock date or purchase date in the future is changed to today on save. A return date is kept between the sale date and today.
- "Entered today" for a team = distributors whose latest sales entry is dated today.
- Share % on Teams = distributor value ÷ team value; team % = team value ÷ all sales.
- Brands list = the five built-in brands plus any brand used by a model, matched without regard to case.
- District list = Sri Lanka's 25 districts grouped by 9 provinces; old records with only a town take the district of the same name.

# 9. Validations

| **Where** | **Rule and message** |
| --- | --- |
| Sign in | Email and password required; wrong → "Wrong email or password." |
| Passwords (all) | At least 8 characters. Change password: both boxes must match. |
| Team leader | Name required. Email optional, but if given must look like an email; then password 8+. Email must not already belong to another profile. |
| Distributor | Name and team leader required (super admin only). |
| Model | Model name and dealer price required; brand required ("Type the new brand name" if "+ New brand…" chosen but empty). Prices are whole numbers ≥ 0. |
| Sales entry | Distributor required; at least one unit; quantities whole numbers ≥ 0; shops/invoices whole numbers; no future date. Over-stock and same-day duplicate only warn. |
| Shop return | At least one unit; not more than what is left on the sale per model; date between sale date and today. |
| Stock form | Distributor required; at least one non-zero change; Adjust needs a note; team leaders may only save primary purchases. |
| Edit primary purchase | Units > 0; date not in the future; something must change. |
| Targets (database) | Month is the 1st; units > 0; count-from date inside the month; one row per month + distributor + model. |
| Stock (database) | qty ≠ 0; kind one of in, buy, return, count, shopret. |
| Distributor (database) | Team leaders can change only lat/lng (trigger). |

# 10. Ownership, consistency and deletion cascades

## 10.1 Ownership

- Everything about a distributor (sales, stock, targets) belongs to that distributor's team leader for viewing and entry. Moving a distributor to another team moves all its history with it, because history hangs off the distributor, not the leader.
- "Entered by" records the person who saved a row; it is shown but gives no extra rights.
- The super admin profile is created by hand in the database (no screen).

## 10.2 What deleting does

| **Deleting…** | **Also deletes / effect** |
| --- | --- |
| A team leader (People → Remove) | Their distributors, and through them all sales, stock movements, shop returns and targets. The login is banned with a random password. Returns counts of distributors and sales. |
| A distributor (Edit → Remove distributor) | All its sales entries, stock movements (incl. shop returns) and targets. No confirmation today. |
| A sales entry | Its shop returns are deleted too. The sale's units no longer come off stock, so stock in hand goes up. |
| A shop return | The units return to the sale and leave stock again. |
| A primary purchase | Achievement and stock drop at once. |
| A target set (Delete targets) | Only that distributor's targets for that month. |
| A model (Remove) | Soft delete: hidden from Products and all entry forms; history and totals keep it. "Bring back removed models" undoes it for all. (A hard delete in the database would cascade to its stock and targets.) |

## 10.3 Consistency rules to keep

- Sale lines keep the dealer price they were saved at.
- Stock, achievement and totals are always derived from movements and sales, never typed in.
- A shop return can never exceed what is left on its sale.
- Targets are unique per month + distributor + model, and their count-from date stays inside the month.
- Only one person's role decides access: super admin or team leader; there is no per-screen permission setting.

# 11. Known gaps and inconsistencies

Things to decide on in the rebuild. Most are cheap to fix in a new design.

## 11.1 Security and rules

- **10_stock_super_only.sql was never run.** Today the database lets a team leader write any kind of stock movement for their own distributors; only the screens stop them setting opening stock, adjusting or recording returns to the company. Also, the file as written would allow leaders only "shopret", which would now **break** their primary purchases ("buy"). Rebuild: allow leaders buy + shopret only, on the server.
- The super admin's price ticks, the map and the People page are hidden from leaders in the UI; the matching data rules exist only partly.
- Login creation writes directly into the auth tables through database functions; a rebuild should use the auth provider's admin API.

## 11.2 Behaviour that is inconsistent

- Team leaders can delete a primary purchase from the target card, but not from the stock history list (where only shop returns have Delete).
- A primary purchase can only be edited from the target card, which lists only this month's purchases that count towards a target. Purchases of models without a target, or in other months, cannot be edited at all.
- "Remove distributor", "Delete this entry" (sales), and stock history deletes happen with **no confirmation**, while target deletes need a second tap. Removing a distributor wipes all its data silently.
- There is no way to **edit** a shop sales entry; it must be deleted and re-entered.
- Rupee values of primary purchases, targets and stock change when a price changes (no price snapshot), while shop sales at dealer price do not. MRP / distributor-price views of old sales also use today's prices.
- Adding a model fills blank MRP / distributor price with sample ratios; editing a model saves blanks as 0.
- Team leaders always see dealer price, but the Models page still shows them MRP and distributor price.
- The period choice is shared across pages, which can surprise users (a range picked on All sales also filters Teams and the Map).
- The "By brand" chart is hidden when a brand filter is on.
- schema.sql allows a distributor without a team leader (on delete set null), and the app still has a "No team leader" group, although the rule is that every distributor has one.

## 11.3 Data model gaps

- There is no invoice or shop entity: invoices and shops are counts on the sales entry, and a shop return's invoice number is free text in a note.
- No brands table: brand is free text; colours are hard-coded; a typed brand disappears when its last model is removed.
- Sale lines are JSON with no foreign key to products.
- Opening stock and the older "Stock given" rows share the kind "in"; history before 18 Nov may mix them.
- Stock starts from each distributor's first movement; shop sales before that are ignored, and stock goes negative when a sale exceeds it.
- Adjustments and opening-stock differences are calculated in the browser from possibly stale data; two people editing at once can save the wrong difference.
- No audit trail beyond "entered by" and the edit note on primary purchases.
- Daily targets use calendar days; working days and holidays are undecided with the client.
- "Today" is the device's local date, not fixed to Sri Lanka time.
- Real MRP and distributor prices and most model specifications are still missing from the client.

## 11.4 Technical limits of the current build

- The whole database the user may see is loaded into the browser at sign-in; there is no paging. This will slow down as sales grow.
- No offline mode; phones need a connection to save.
- IDs are made in the browser.
- The live site is the old app patched in the browser by six layers; this document, not any single file, is the full description of its behaviour.
- The map's grey shop dots and town list come from demo seed data.

# 12. Reports and charts (summary)

| **Where** | **What it shows** |
| --- | --- |
| Teams | KPI tiles; per-team totals with share %; per-distributor last entry, invoices, units, value, share, brand bar. |
| Distributor page | Target card KPIs and per-model progress; stock KPIs and per-model stock; sales KPIs, brand bar and entries. |
| All / Team sales: Shop sales trend | Bars per day (per week when the range is over 62 days) of value or units (Value / Units switch), dotted 7-day average line (daily only). The best day is highlighted. A single day is shown with the 6 days before it. Tapping a bar switches the period to that day. KPIs: average per selling day, best day (value and units), and % change vs the same number of days just before (when a period is chosen). Follows team / distributor / brand filters. |
| All / Team sales: Top models | Top 8 models by value or units for the period, bar in brand colour, units and value; "+ N more models". |
| All / Team sales: By brand | Share of value or units per brand with %, and units. |
| Targets: Primary purchases vs target | For the month and the teams/distributors shown: grey bars of everything bought each day; green running total of what counts; dashed target pace line (where the total should be each day). KPIs: counted so far, month target, % of where it should be by today. Value or units. |
| Targets tables | Target vs achievement by team leader, distributor and model, with Done %, Pace, still to buy. |
| Today box | Today's target vs bought, month pace, needed per day. |
| Stock | Units and value in hand by distributor and by model, low-stock counts. |
| Map | Distributor locations with period sales in each popup. |

Not built yet (planned on 19 Nov, awaiting approval): a super-admin Dashboard with a sales calendar used as the date picker, and a Shop sales / Primary switch.

# Appendix A. Current tables mapped to a suggested Next.js data model

A functional suggestion only: what each concept should become so the gaps in section 11 disappear. Field names are illustrative. If you plan to sell this to several companies, add a company (tenant) to every row; the rest stays the same.

| **Today** | **Suggested** | **Why** |
| --- | --- | --- |
| st_profiles + auth user (linked by email) | User (login) + Membership (user, company, role: super_admin \| team_leader) | Link by user id, not email; role per company. |
| st_distributors.leader_id (nullable in schema) | Distributor with team_leader_id required; optional DistributorTeamHistory | Enforce "always one team leader"; keep who owned it when. |
| st_products.brand (free text), colours in code | Brand (name, colour) + Product (brand_id, model, specs, active flag) | Brands manageable, colours stored. |
| st_products price / mrp / dist | Product prices, optionally a PriceHistory (product, level, price, valid_from) | Value any date at the price of that date. |
| st_sales with JSON lines | ShopSale (distributor, date, shops_covered, invoice_count, entered_by) + ShopSaleLine (product, qty, dealer, mrp and distributor price snapshot) | Real foreign keys; history keeps all three prices; allows editing a sale. |
| st_stock kind "buy" | PrimaryPurchase (+ lines) with price snapshot | Own entity: it drives targets; editable in any month. |
| st_stock kind "shopret" + sale_id | ShopReturn (shop_sale_line, qty, date, invoice/shop ref) | Linked to the exact line, not just the sale. |
| st_stock kinds "in", "count", "return" | StockMovement (kind: opening \| adjustment \| return_to_company, qty, reason) | Server-side rules: super admin only. |
| Stock in hand (calculated in browser) | Calculated on the server (view or query), optionally a cached StockBalance | Fast and consistent; no stale differences. |
| st_targets with start_date | Target (month, distributor, product, qty, count_from) | Same rules; maybe a TargetSet header per distributor-month for reset/delete. |
| (none) | AuditLog (who, what, before, after, when) | Replaces the edit note and supports dispute checks. |
| (none) | Optional: Shop, Invoice; WorkingDayCalendar | If the client wants invoice-level returns or working-day targets. |

# Appendix B. Route list

| **Route** | **Screen** | **Who** |
| --- | --- | --- |
| #/teams | Teams / My team | Both |
| #/d/<id> | Distributor page | Both (own only for leaders) |
| #/adddist?l=<leader> | Add distributor | Super admin |
| #/addleader | Add team leader | Super admin |
| #/new?d=<dist> | Enter sales | Leader (menu), super admin (from distributor) |
| #/sales | All sales / Team sales | Both |
| #/return?s=<sale> | Shop return | Both |
| #/targets | Targets | Both |
| #/settargets?d=&m= | Set targets | Super admin |
| #/stock | Stock | Both |
| #/stockin?d=&k=&p= | Record stock (k = buy \| in \| count \| return; p = model) | Both (leaders: buy only) |
| #/map | Map | Super admin |
| #/people | People | Super admin |
| #/products | Products / Models | Both (edit: super admin) |
| #/account | Change password | Both |
