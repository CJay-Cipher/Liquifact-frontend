# Filter Controls — Implementation Contract

## Overview

The invest marketplace exposes client-side filter controls for yield, currency, maturity date, and sort order (with direction toggle), plus an issuer search field. Filtered results are summarized above the invoice list with a visible count line and removable active-filter chips.

## Invoice Object Schema

The marketplace maps to the following object structure. The `filterInvoices()` function and `useInvoiceFilters` hook expect this exact shape when performing derived state calculations.

## Filter Controls

### 1. Issuer Search

- **Purpose:** Filter invoices by issuer name (case-insensitive substring match).
- **UI:** `InvoiceSearch` component with debounced input (`SEARCH_DEBOUNCE_MS = 200`).
- **Active chip:** `Search: {query}` — removing clears the search field.

### 2. Yield Range Filter

- **Purpose:** Filter invoices by yield percentage range.
- **Future API Contract:** `GET /api/invoices?yield_min=5&yield_max=10`
- **Active chips:** `Min yield: {n}%`, `Max yield: {n}%`

### 3. Currency Filter

- **Purpose:** Filter invoices by currency type (USD, EUR, GBP, JPY, CHF).
- **Future API Contract:** `GET /api/invoices?currency=USD`
- **Active chip:** `Currency: {code}`

### 4. Maturity Date Filter

- **Purpose:** Filter invoices by maturity date range.
- **Future API Contract:** `GET /api/invoices?maturity_from=2026-06-01&maturity_to=2026-12-31`
- **Active chips:** `From: {date}`, `To: {date}`

### 5. Sort Options (with direction toggle)

- **Purpose:** Sort filtered invoices by yield, amount, or maturity. Amount and yield support an ascending/descending direction toggle.
- **Sort state shape:**
```ts
  {
    sort:    '' | 'amount' | 'yield' | 'maturity';
    sortDir: 'asc' | 'desc'; // default 'desc'
  }
```
- **Future API Contract:** `GET /api/invoices?sort=amount&sort_dir=asc`
- **Active chip:** `Sort: {label}` (e.g. `Sort: Best Yield`)

#### Direction toggle behaviour

| State | UI element | `aria-sort` value |
|---|---|---|
| Column active, dir = `desc` | ↓ button, enabled | `descending` |
| Column active, dir = `asc` | ↑ button, enabled | `ascending` |
| Column **not** active | ↓ button, disabled | `none` |

Only `amount` and `yield` columns have direction toggles. Maturity is sorted via the main select only.

#### `parseSortState(filters)` helper
Returns `{ column: string, dir: 'asc'|'desc' }`. Supports both new plain-column values (`'amount'`, `'yield'`) and legacy compound values (`'amount_desc'`, `'yield_asc'`).

#### `applySortToList(list, filters)` helper (`page.js`)
Pure function returning a sorted copy of the invoice list. Does **not** mutate the original array.

### 6. Clear Filters

- **Filter panel:** `Clear Filters` button resets structured filters only (yield, currency, maturity, sort + sortDir back to `'desc'`).
- **Results summary:** `Clear all` button resets structured filters **and** the issuer search query.
- Disabled when no filters are active.

## Results Summary

Rendered by `ActiveFilterSummary` in [`components/InvoiceFilters.jsx`](components/InvoiceFilters.jsx), placed above the invoice list in [`app/invest/page.js`](app/invest/page.js).

### Visible count line

- Format: **`Showing {visible} of {filteredTotal} invoice(s)`**
- `{visible}` — invoices currently rendered (respects pagination / load-more).
- `{filteredTotal}` — total invoices matching the current search + filter derivation.

### Active-filter chips

- One removable chip per active filter (including search and sort direction when active).
- Each chip exposes `aria-label="Remove {label}"` and removes only that filter.
- `Clear all` resets every active filter and the search query.

## Accessibility

- **Single live region:** One screen-reader-only `role="status"` region with `aria-live="polite"` in the invest page announces load, filter, and pagination changes. The visible summary line does not use `aria-live` to avoid competing announcements.
- Direction toggle buttons carry `aria-sort` (`ascending` | `descending` | `none`). Inactive toggles are `disabled`.
- All filter inputs and chip remove buttons are keyboard-focusable with visible focus rings.
- Active-filter chip list uses `aria-label="Active filters"`.

## Responsive Design

- Filter controls and chip row wrap on smaller screens using `flex-wrap`.
- Direction toggles sit inline next to the sort select.
- Maintains spacing and layout across breakpoints.

## Implementation Notes

- Filter derivation lives in `filterInvoices()` exported from `app/invest/page.js`.
- Chip metadata is built by `getActiveFilterChips()` in `components/InvoiceFilters.jsx`.
- `DEFAULT_FILTERS.sortDir` defaults to `'desc'`.
- `SORTABLE_COLUMNS` constant exported from `InvoiceFilters.jsx`: `['amount', 'yield']`.
- Pagination resets to `PAGE_SIZE` whenever search or structured filters change.
- Uses Tailwind CSS classes consistent with the existing slate-950/cyan-400 design system.

## Backend Integration Requirements

When implementing server-side filtering:

1. Accept `sort` (column name) and `sort_dir` (`asc`|`desc`) query parameters.
2. Mirror the filter query parameters documented above.
3. Return total unfiltered count separately if needed for "X of Y total marketplace" views.
4. Add pagination support for large datasets.
5. Validate filter parameters and return appropriate error responses.

## Testing Checklist

- [x] Visible summary shows `Showing X of Y invoices` from filtered derivation
- [x] Active-filter chips appear for search and each structured filter
- [x] Individual chip remove clears only that filter
- [x] `Clear all` resets search and structured filters
- [x] Single polite live region announces filter/load updates
- [x] Summary visible when zero invoices match (with chips retained)
- [x] Responsive layout wraps on narrow viewports
- [x] `DEFAULT_FILTERS` includes `sortDir: 'desc'`
- [x] `parseSortState` correctly extracts column and direction (including legacy compound values)
- [x] `applySortToList` sorts amount and yield in both directions
- [x] `applySortToList` does not mutate the source array
- [x] Direction toggle button is enabled only for the active sort column
- [x] `aria-sort` reflects current direction on the active column toggle
- [x] Inactive column toggle has `aria-sort="none"`
- [x] Clicking the active toggle flips direction (`desc → asc`, `asc → desc`)
- [x] Clicking a disabled toggle does not call `onFilterChange`
- [x] Changing the sort column preserves existing `sortDir`
- [x] Clearing filters resets `sortDir` to `'desc'`
- [x] Accessibility labels present on all controls
- [x] Color contrast meets WCAG standards
- [x] No console errors on page load