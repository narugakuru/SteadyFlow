## Context

The previous shared `HoldingRow` refactor reduced action noise, but the Dashboard discipline table still has mismatched summary and holding row semantics. Summary rows contain progress/status/rebalance concepts while holding rows contain shares/cost/actions, so the visual columns do not line up. The Accounts page has a similar problem in a different form: it still uses an operational table surface with headers, column sorting, and inline action buttons even though the desired workflow is a compact account-value scan followed by an expanded holdings table.

## Goals / Non-Goals

**Goals:**

- Give Dashboard discipline summary rows and holding rows one shared column language.
- Remove discipline status/action visual noise from both desktop and mobile.
- Keep asset-class summary row expand/collapse behavior.
- Let discipline holding rows open a details drawer for deeper data and actions.
- Turn the Accounts page into a compact account list sorted by converted total value descending.
- Preserve Accounts page top business actions: add account, update prices, and show zero-market-value holdings.
- Use a dedicated account holdings table for expanded account rows.

**Non-Goals:**

- No database, API, or cache changes.
- No historical performance metric changes.
- No account grouping by portfolio category such as "投资/储蓄".
- No daily price-change display in account holdings.
- No additional account sorting UI in this change.
- No redesign of account, holding, or transaction dialogs beyond where they are launched.

## Decisions

### Replace discipline table semantics with four columns

Discipline desktop rows use four visible columns: asset class, reference metric, market value, and holding P&L. The summary row maps reference metric to allocation progress, while holding rows map reference metric to current price. This keeps rows aligned even though they represent different hierarchy levels.

Alternative considered: keep six columns and hide empty cells. That preserves old structure but keeps the visual mismatch that triggered the change.

### Use a drawer for discipline holding details

Discipline holding rows should not show shares, cost, and operations in the main list. Clicking a holding row opens a right-side drawer on desktop with detail metrics and buy/sell/edit actions. Mobile keeps card-based rows and can use the existing dialog/sheet system if a details surface is needed during implementation.

Alternative considered: keep the row `...` menu. It reduces button noise but does not solve the need to move deeper data out of the row.

### Remove discipline status/action presentation

The status column, status badge, and adjustment/sort action affordances are removed from the visible discipline table/card. This intentionally makes the discipline area a read-and-expand surface rather than a dense control table.

Alternative considered: move status into a tooltip or badge inside the asset column. That keeps status available but still adds noise to the main scan path.

### Refactor Accounts page independently from `HoldingRow`

Account expanded holdings should render via a dedicated `AccountHoldingTable` with explicit headers and one-line rows. Reusing `HoldingRow` would preserve too much card/menu behavior and make it harder to align with the requested table.

Alternative considered: continue reusing `HoldingRow` with account-specific props. That would reduce code, but the display semantics are now different enough to justify a separate component.

### Remove account table headers and sorting controls

The Accounts page no longer exposes account-column sorting. It defaults to converted total account value descending based on the current display currency. Top business controls remain.

Alternative considered: keep sorting in a compact menu. The user explicitly requested deleting sorting options for now.

## Risks / Trade-offs

- [Risk] Removing visible discipline status may hide useful rebalance context. -> Mitigation: this change follows the requested simplification; rebalance suggestions remain elsewhere on the Dashboard.
- [Risk] Removing account sorting UI changes existing user behavior. -> Mitigation: default sorting by converted total value desc matches the requested primary scan path.
- [Risk] Drawer interactions may conflict with row expand/collapse. -> Mitigation: only asset-class summary rows expand/collapse; holding rows open details.
- [Risk] Dedicated account table duplicates some holding formatting logic. -> Mitigation: keep formatting helpers shared and keep the new component narrowly scoped.
