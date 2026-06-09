## Why

The shared holding row still follows the older two-line action-heavy layout, which now clashes with the updated app shell and dashboard visual density. The same component is used by the Dashboard asset allocation discipline table and the Accounts page, so updating it once can bring both surfaces back in line with the current design system.

## What Changes

- Refactor the shared holding row into a denser responsive component.
- On desktop, render holdings as a single-row data grid with asset info, shares, price info, value/weight, P&L, and actions.
- Right-align numeric columns on desktop so values can be compared vertically.
- Combine market value and portfolio weight into one value/weight column.
- Move buy, sell, and edit actions behind a row-end `...` menu instead of exposing transaction/edit buttons inline.
- Keep the Accounts page delete action as a separate small trash icon at the far right; it is not part of the `...` menu.
- Keep the Dashboard discipline table menu limited to buy, sell, and edit; it does not expose delete.
- On mobile, render the same holding data as a high-density info card with a header, highlighted market value/weight, and compact detail grid.
- On mobile, use the same lightweight `...` menu pattern; do not introduce a bottom sheet for holding actions.
- Preserve existing edit dialog, transaction form defaults, display-currency conversion, P&L color semantics, memo visibility, and account-name badge behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `dashboard`: Asset allocation discipline expanded holdings use the new shared responsive holding row and compact action menu.
- `account-management`: Account holdings use the new shared responsive holding row while preserving account-only delete behavior.
- `mobile-responsive`: Mobile holding rows use a dense card layout with a lightweight action menu and adequate touch target.

## Impact

- Frontend components:
  - `src/components/holding-row.tsx`
  - possibly a small shared UI menu wrapper if needed
- Existing callers:
  - `src/components/discipline-table.tsx`
  - `src/components/account-list.tsx`
- Specs and documentation:
  - `openspec/specs/dashboard/spec.md`
  - `openspec/specs/account-management/spec.md`
  - `openspec/specs/mobile-responsive/spec.md`
  - `project_overview.md`
- No database migration, API change, or new external dependency is expected.
