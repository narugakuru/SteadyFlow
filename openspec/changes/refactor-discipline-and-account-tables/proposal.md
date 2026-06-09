## Why

The Dashboard discipline table and Accounts page still carry table-era visual weight that conflicts with the simplified Wealthfolio-style app shell. The discipline summary rows and holding rows also use mismatched column semantics, while the Accounts page exposes too many headers and sorting controls for a page that should primarily scan account value and holdings.

## What Changes

- Refactor the Dashboard discipline table into a simpler four-column desktop layout: asset class, reference metric, market value, and holding P&L.
- Rename discipline summary "金额" to "市值".
- Remove the discipline status/action column from desktop and remove status/suggestion presentation from mobile cards.
- Keep asset-class summary row click behavior as expand/collapse.
- Render expanded discipline holdings in the same four-column semantics: holding identity, current price, market value, and holding P&L.
- Move deep holding information such as shares, cost, weight, buy, sell, and edit into a right-side desktop drawer opened by clicking a holding row.
- Keep mobile discipline holdings as card-based rows, with minor simplification to remove status/suggestion UI.
- Refactor the Accounts page away from a table with headers and sort controls.
- Account rows display only account name/currency on the left and total value plus holding P&L on the right.
- Account rows default-sort by total account value converted into the current display currency, descending.
- Preserve top-level Accounts page business actions: add account, update prices, and show zero-market-value holdings.
- Expand an account below its row into a dedicated `AccountHoldingTable` with columns: holding, shares, current price, cost price, market value, and P&L.
- Do not show current-price daily change in account holding rows.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `dashboard`: Simplify the asset allocation discipline table layout, remove status/action columns, and introduce discipline holding detail drawer behavior.
- `account-management`: Replace the account table/header/sort controls with an account value list and dedicated expanded holdings table.
- `mobile-responsive`: Adjust discipline and account mobile layouts to match the simplified information hierarchy.

## Impact

- Frontend components:
  - `src/components/discipline-table.tsx`
  - new or refactored discipline holding detail drawer component if useful
  - `src/components/account-list.tsx`
  - new `src/components/account-holding-table.tsx`
- Existing UI primitives:
  - `Dialog` or `Sheet` may be reused for holding details.
  - Existing `Button`, `Badge`, and `DropdownMenu` primitives may be reused.
- Specs and documentation:
  - `openspec/specs/dashboard/spec.md`
  - `openspec/specs/account-management/spec.md`
  - `openspec/specs/mobile-responsive/spec.md`
  - `project_overview.md`
- No database migration, API change, cache-key change, or new external dependency is expected.
