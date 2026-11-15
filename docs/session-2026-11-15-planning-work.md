# Session report — SBF Pulse planning workspace

**Date:** 15 November 2026  
**Project:** SBF Pulse — Next.js admin dashboard  
**Reference prototype:** `SBFPulse_v7.html`

## 1. Business request captured

The requested workflow was to make the planning area a practical weekly offer-planning workspace inspired by the reference HTML prototype:

- Keep planning in its own dashboard tab.
- Display all planned events in a calendar.
- Make planning searchable through dropdowns for each segment of an identifier split by `/`.
- Limit one planning lifespan to one week.
- Provide complete PDF and CSV exports once the planning period is finished.
- Clarify the relationship between markets and planning entries.
- Generate identifiers such as:
  - `T/VRD/31/2026`
  - `T/BAT/14/2026`
  - `T/HYD/08/2026`
- Auto-increment the numeric segment by category and year.
- Keep the dashboard focused on the KPI concepts from the original HTML.
- Create markets from a modal rather than from a permanent sidebar shortcut.
- Remove margin-expectation KPIs and related form fields.
- Keep the market form focused on the fields represented in the reference HTML.
- Make the resulting application direct and operational rather than exploratory.

## 2. Existing application context

The application already contained:

- A `/dashboard/planning` route.
- A `planning_tasks` table used for construction-task Gantt views.
- A markets module backed by Supabase.
- A markets creation dialog.
- A dashboard with several KPI cards, charts, and operational panels.
- A sidebar item for creating a new market.
- Market fields for expected margin and execution tracking.

The existing construction-task planning model did not match the requested weekly offer-planning workflow, so a separate planning-entry model was introduced instead of overloading `planning_tasks`.

## 3. Weekly planning data model

### New migrations

Added:

- `supabase/migrations/0003_weekly_planning.sql` — table, constraints, trigger, RLS.
- `supabase/migrations/0004_planning_hardening.sql` — atomic numbering, year derived from
  the start date, renumbering on category/year change, consolidation of the redundant
  `submissions` table.

The migration creates the `public.planning_entries` table with:

- `id`
- optional `project_id` relation to `public.projects`
- generated `code`
- `category`
- `entry_number`
- `year`
- `name`
- `client`
- `start_date`
- `end_date`
- `decision`
- timestamps

### Relationship between markets and planning

Each planning entry can optionally reference an existing market through `project_id`.

This allows both workflows:

1. Add an offer to planning before a market record exists.
2. Link a planning entry to an existing market when the market is already known.

The market selector is optional and displays the market code, when available, together with the market name.

### One-week lifespan

The database enforces:

- `end_date >= start_date`
- `end_date - start_date < 7`

The client form also validates the same rule and displays an error when the selected range exceeds one week.

## 4. Automatic planning identifiers

A database trigger was added through `0003_weekly_planning.sql` and then hardened in
`0004_planning_hardening.sql`:

- `set_planning_entry_code()`
- trigger: `planning_entries_code`

When a new planning entry is inserted:

1. The category is normalized to uppercase and required (empty categories are rejected).
2. The year is taken from the start date; the client can no longer supply it.
3. The next number is calculated for the same category and year under an advisory lock,
   so two concurrent inserts cannot receive the same number.
4. The identifier is generated using:

```text
T/{CATEGORY}/{NN}/{YEAR}
```

Examples:

```text
T/VRD/01/2026
T/VRD/02/2026
T/BAT/01/2026
T/HYD/01/2026
```

The sequence is independent for each category and year.

If a row's category or start-date year is updated, the trigger recalculates the number in
the new category/year bucket and rewrites `code` accordingly. `PlanningEntryInput` therefore
no longer carries `year` (nor `code`/`entry_number`): the database alone owns those fields.

## 5. Planning interface

Reworked:

- `src/features/sbf/components/planning-overview.tsx`

The planning screen now includes:

### Calendar

- Seven-day calendar grid.
- Previous and next week navigation.
- Week date selector.
- Entries appear on every day covered by their date range.
- Calendar entries display the generated identifier and project name.

### Planning table

The table displays:

- Code
- Market/project name and category
- Linked market (with a link to the market page)
- Client
- Date range and duration in days
- Participation decision
- Edit action (opens the same dialog pre-filled)
- Delete action (with a confirmation dialog)

Summary tiles above the table show the number of filtered entries, the workload of the
displayed week (labelled with its ISO week number), and the pending / accepted / declined
counts.

### Identifier filters

The identifier is split into `/`-delimited segments and exposed through dropdowns:

- Prefix
- Category
- Number
- Year

This supports targeted filtering such as:

- all `VRD` entries
- a specific sequence number
- all entries for a year
- all entries with the `T` prefix

### Category dropdown

The category field was changed from free text to a dropdown containing:

- `VRD — Voirie et réseaux divers`
- `BAT — Bâtiment`
- `HYD — Hydraulique`
- `IND — Industriel`
- `STR — Structures`
- `AUT — Autre`

The selected value remains compact in generated identifiers.

### Add-planning dialog

The planning form is a modal and contains:

- Category
- Optional linked market
- Project name
- Client
- Start date
- End date
- Participation decision

The generated code is intentionally assigned by the database rather than manually typed by the user.

## 6. Planning API integration

Extended:

- `src/lib/sbf/types.ts`
- `src/lib/sbf/api.ts`

Added types:

- `PlanningEntry`
- `PlanningEntryInput`

Added React Query hooks:

- `usePlanningEntries`
- `useSavePlanningEntry`
- `useDeletePlanningEntry`

Added query key:

```text
planning-entries
```

Realtime synchronization was also extended so changes to `planning_entries` invalidate the planning query for connected clients.

## 7. CSV export

The CSV export now:

- Includes a header row.
- Uses explicit columns:
  - Code
  - Catégorie
  - Projet / offre
  - Marché lié
  - Client
  - Début
  - Fin
  - Décision
- Quotes every cell.
- Escapes embedded double quotes.
- Uses semicolon-separated cells for spreadsheet compatibility in French locales.
- Uses CRLF line breaks.
- Includes a UTF-8 BOM so Excel opens accented French content correctly.
- Downloads a dated filename such as:

```text
planning-sbf-2026-11-15.csv
```

The export respects the active identifier filters.

## 8. PDF export

The PDF action uses the browser print dialog, allowing the user to select “Save as PDF”.

A dedicated print-only report template was added to the planning component. It includes only:

- SBF Pulse heading
- Planning report title
- Period actually covered by the **filtered** entries (not the calendar week)
- Number of filtered entries, with pending / accepted / declined breakdown
- A clean table with:
  - Code
  - Project/offer
  - Linked market
  - Client
  - Start date
  - End date
  - Decision
- A short report footer

The regular dashboard controls, filters, calendar, dialogs, action buttons, page header,
sidebar, and mobile navigation are hidden while printing (print CSS in
`src/styles/globals.css` plus `print:hidden` on the chrome components).

## 9. Market navigation and form changes

Updated:

- `src/config/nav-config.ts`

Removed the permanent “Nouveau marché” sidebar item. Markets remain accessible from the markets page, where creation is handled through the modal.

Updated:

- `src/features/sbf/components/project-form.tsx`

Removed the expected-margin form field and removed non-reference execution fields from the main market form so the form stays closer to the fields in the original HTML prototype.

Updated:

- `src/features/sbf/components/projects-list.tsx`
- `src/features/sbf/components/project-fiche.tsx`

Removed expected-margin presentation from market lists and market financial details. Actual financial result information remains available where it is operationally useful.

## 10. Dashboard KPI changes

Updated:

- `src/features/sbf/components/dashboard-view.tsx`
- `src/lib/sbf/calc.ts`

The dashboard KPI section was reduced toward the KPI concepts from the reference HTML:

- Carnet de commandes
- Offres en attente
- Offres perdues
- Taux d’acceptation

Removed from the dashboard KPI row:

- Expected/average margin KPI
- Result-at-date KPI
- Late-sites KPI
- KPI non-respected KPI

The market KPI validation logic no longer treats expected margin as a KPI requirement.

## 11. Runtime fixes found during the session

### Theme shortcut error

Error:

```text
Cannot read properties of undefined (reading 'toLowerCase')
```

File:

- `src/components/themes/theme-mode-toggle.tsx`

Cause:

- The keyboard event handler assumed `event.key` was always a string.

Fix:

- Added a type guard before calling `.toLowerCase()`:

```ts
if (typeof e.key !== 'string' || e.key.toLowerCase() !== 'd' || ...) return;
```

### Planning form reset error

Error:

```text
Cannot read properties of null (reading 'reset')
```

File:

- `src/features/sbf/components/planning-overview.tsx`

Cause:

- `event.currentTarget` was read inside an asynchronous mutation success callback.
- React no longer guarantees that `currentTarget` remains available after the event handler has returned.

Fix:

- Captured the form element synchronously before starting the mutation:

```ts
const formElement = event.currentTarget;
const form = new FormData(formElement);
```

- Reset the captured element in the success callback:

```ts
formElement.reset();
```

## 12. Supabase migration status

The new migrations were applied to the connected Supabase project using the Supabase
migration operation (`0003_weekly_planning`, then `0004_planning_hardening`).

The resulting table was verified through `information_schema` and confirmed to contain:

- `id`
- `project_id`
- `code`
- `category`
- `entry_number`
- `year`
- `name`
- `client`
- `start_date`
- `end_date`
- `decision`
- `created_at`
- `updated_at`

This resolved the runtime error:

```text
Could not find the table 'public.planning_entries' in the schema cache
```

## 13. Validation completed

The following checks passed after the implementation:

```text
npm run lint
npm run typecheck
npm run build
```

The production build completed successfully and included:

- `/dashboard/planning`
- `/dashboard/marches`
- existing market and import routes

## 14. Final user workflow

The intended workflow is now:

1. Open the **Planning** tab.
2. Click **Ajouter**.
3. Select a category from the dropdown.
4. Optionally link an existing market.
5. Enter the project and client information.
6. Select a date range of no more than seven days.
7. Choose the participation decision.
8. Save the planning entry.
9. The system generates the identifier automatically.
10. Use the calendar to see the weekly workload.
11. Use the identifier-part dropdowns to filter the table.
12. Export the filtered table as CSV or print it as a PDF report.

## 15. Important implementation note

The original `planning_tasks` construction planning model remains in the codebase for market-specific execution planning. The new `planning_entries` model is intentionally separate because offer-submission planning and construction execution planning have different business lifecycles and fields.

## 16. Corrections after review

The first pass worked but left several issues. They were all fixed in a second pass.

### 16.1 Dates shifted by one day

**Symptom:** a planning entry created for the 15th could appear on the 14th (or the 16th),
depending on the browser time zone.

**Cause:** dates were built with `new Date(...).toISOString().slice(0, 10)`. `toISOString()`
converts to UTC, so any positive offset (Tunisia, UTC+1) moved local midnight to the
previous day.

**Fix:** all date math goes through `toISODate` / `parseISODate` from
`src/lib/sbf/format.ts`, which read and write local calendar dates. Helpers added in
`src/lib/sbf/planning.ts`: `addDays`, `mondayOf`, `weekStart`, `diffInDays`,
`maxEndDate`, `weekDaysOf`, `isoWeekNumber`.

### 16.2 Print output contained the application chrome

Printing produced the sidebar, header, and mobile navigation around the report.

**Fix:** added print rules to `src/styles/globals.css` (`[data-slot='sidebar']`, page shell)
and `print:hidden` on the header, sidebar, mobile navigation, and page container. The report
template is `hidden print:block`, so only the report is printed.

### 16.3 Delete had no confirmation, and entries could not be edited

**Fix:** the row action now opens an `AlertDialog` naming the code and entry. An edit button
reopens the create dialog pre-filled. The dialog explains that changing the category or the
start-date year renumbers the identifier, which is the behavior the database implements.

### 16.4 The linked market was invisible in the table

`project_id` was stored but the table only showed the entry name.

**Fix:** a dedicated "Marché lié" column shows `code · name` and links to the market page.
The CSV, the PDF report, and the entry dialog all expose the same label.

### 16.5 Remaining expected-margin references

`calc.ts`, `trends.ts`, and `config/sbf.ts` still exposed margin helpers even though the
KPI and form fields were gone. They were removed, and the README business-settings table no
longer lists `margeObjectif`.

### 16.6 Database numbering was not safe under concurrency

`0003` computed the next number with a plain `max(entry_number) + 1`, which can hand the same
number to two simultaneous inserts, and it accepted a client-supplied `year`.

**Fix (migration `0004_planning_hardening.sql`):**

- `year` is always derived from `start_date`; `PlanningEntryInput` no longer includes it.
- The number is allocated under `pg_advisory_xact_lock(hashtext(category || ':' || year))`.
- Updates to `category`, `start_date`, or `year` trigger a renumber in the correct bucket.
- Empty categories raise an explicit error.
- The legacy, redundant `submissions` table from `0002` is migrated into
  `planning_entries` (when non-empty) and then dropped.

A trigger insert/update/rollback test confirmed that the year is derived and the code
renumbers as expected.

### 16.7 Summary tiles followed the wrong week

The second tile was labelled "Cette semaine" but counted the week currently displayed in the
calendar, so navigating to another week produced a misleading label.

**Fix:** the tile is labelled with the displayed ISO week (e.g. "Semaine 47"), and a fifth
tile exposes declined entries — the count was already computed but never displayed.

### 16.8 Validation after the corrections

```text
npm run lint      → OK
npm run typecheck → OK
npm run build     → OK (12 routes, /dashboard/planning included)
```

### 16.9 Known data caveat

The remote database still contains one legacy row with code `T/DDD/01/2026` (category
`DDD`, inherited from the prototype). It is preserved on purpose: the filters read the
categories actually present in the identifiers, and the edit dialog offers the legacy value
as an extra option so the row can be updated without losing its history.
