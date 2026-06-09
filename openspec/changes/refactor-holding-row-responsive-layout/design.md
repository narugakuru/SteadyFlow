## Context

`HoldingRow` is the shared holding information strip used by the Dashboard asset allocation discipline table and the Accounts page. It currently renders a two-line desktop layout and a stacked mobile layout with inline transaction/edit buttons. After the broader UI refactor, this component is visually heavier than the surrounding dashboard/account surfaces and exposes actions where the user mostly needs to scan data.

The component already owns the important behavior: display-currency conversion, total-asset weight, P&L coloring, memo display, holding edit dialog, and transaction form defaults. The implementation should preserve those contracts while changing layout and action presentation.

## Goals / Non-Goals

**Goals:**

- Make desktop holding rows read like a compact single-line data grid.
- Make mobile holding rows read like dense information cards.
- Move buy, sell, and edit actions into a row-level `...` menu.
- Preserve the Accounts page delete action as a separate trash icon at the far right.
- Keep one shared `HoldingRow` DOM structure path for Dashboard and Accounts where practical.

**Non-Goals:**

- No bottom sheet for mobile holding actions.
- No change to holding, account, transaction, or pricing APIs.
- No database migration.
- No change to the rule that deleting a holding is only allowed when the underlying delete flow accepts it, such as zero-share holdings.
- No redesign of account cards, asset-category rows, sorting controls, or transaction/edit dialogs.

## Decisions

### Use the shared `HoldingRow` as the integration boundary

Both affected surfaces already call `HoldingRow`, so the change should stay inside that component unless a caller needs to distinguish account-only behavior. This avoids maintaining separate account and discipline row layouts.

Alternative considered: create separate `AccountHoldingRow` and `DisciplineHoldingRow` components. That would make account-only delete behavior explicit, but it would duplicate currency, P&L, memo, and transaction/edit logic.

### Use a lightweight menu for buy, sell, and edit on all breakpoints

Desktop and mobile both use a `...` trigger for buy, sell, and edit. This keeps interaction predictable and avoids implementing a separate bottom-sheet interaction that the current workflow does not need.

Alternative considered: desktop dropdown plus mobile bottom sheet. This was rejected because mobile actions are few and do not justify the extra interaction surface.

### Keep account delete outside the menu

`actions="full"` remains the account-page signal for delete capability. The delete icon stays as a small destructive ghost button at the far right, separate from the `...` menu. `actions="compact"` does not render delete.

Alternative considered: place delete inside the menu for account rows. This would reduce visible actions further but makes a destructive action easier to tap accidentally and conflicts with the requested account-page behavior.

### Prefer CSS breakpoint changes over duplicate DOM trees

The component can use responsive Tailwind grid/flex classes for desktop and mobile. Some wrapper differences are acceptable where they improve readability, but the same computed display values and handlers should be reused.

Alternative considered: fully separate desktop and mobile render branches. The current component already has this pattern, but the refactor should avoid increasing duplication where shared subparts are simple.

## Risks / Trade-offs

- [Risk] A compact desktop grid may truncate long holding names or tickers. -> Mitigate with `min-w-0`, truncation on text fields, and fixed/right-aligned numeric columns.
- [Risk] The action menu may be clipped by parent containers. -> Mitigate with a portal-backed Radix menu wrapper if available through the existing `radix-ui` package.
- [Risk] Mobile menu trigger may be visually small. -> Mitigate by keeping the visible icon small but the button hit area at least 44px on mobile.
- [Risk] Deleting holdings remains account-only and may be confused with menu actions. -> Mitigate by placing the trash icon after the menu and using destructive color/aria label.
