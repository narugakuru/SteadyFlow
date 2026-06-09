## Context

The previous refactor made the account page and dashboard discipline table more compact, but it also removed the account edit entry from the account flow and pushed the dashboard discipline holding rows too close to a generic desktop table on mobile. The current dashboard discipline table also keeps a top-level header even though category summary rows already carry enough context.

This change is presentation-only. It must preserve existing data loading, currency conversion, discipline category expand/collapse, holding detail drawer, buy/sell/edit flows, and account top-level business controls.

## Goals / Non-Goals

**Goals:**

- Restore the account edit action inside the expanded account detail action area.
- Remove the dashboard discipline top-level header while preserving category rows and existing sorting state.
- Render desktop discipline holdings with the same six-column information model as account holdings.
- Render mobile discipline holdings as independent cards, not as compressed desktop data rows.
- Keep discipline mobile and desktop holding presentation code separated enough that future changes can evolve independently.

**Non-Goals:**

- No database, API, quote, transaction, or account calculation changes.
- No new bottom sheet interaction for mobile holding actions.
- No account list sorting controls or account table header restoration.
- No deletion behavior changes.

## Decisions

1. **Use separate discipline desktop and mobile holding renderers.**

   Desktop expanded discipline holdings will render a subtle six-column header and data rows matching the account holding table's information model. Mobile expanded discipline holdings will render a dedicated card list. This avoids coupling mobile interaction to desktop grid constraints and directly addresses the regression where mobile cards were replaced by desktop rows.

   Alternative considered: one DOM tree with CSS-only responsive changes. That would reduce markup, but the mobile card has different grouping, spacing, and touch behavior than the desktop row, so it would preserve the current source of regression.

2. **Keep the discipline category summary row as the only top-level row.**

   The dashboard discipline table will no longer render the main header row. Asset category names, progress bars, market value, and holding PnL stay visible in the summary row. Sorting affordances for expanded holdings can live in the subtle per-category holding header where the affected rows are visible.

   Alternative considered: keep a visually hidden or low-contrast top header. The user explicitly requested deleting the top header, so the visible UI should not retain it.

3. **Restore account editing as an expanded-detail action, not a row-level icon.**

   The account list remains headerless and minimal. Clicking an account expands details, where "编辑账户" appears after "新建持仓". This keeps the main row visually quiet while restoring the account edit workflow.

## Risks / Trade-offs

- [Risk] Separate desktop/mobile discipline renderers can duplicate formatting code. → Keep shared helper functions for currency, PnL color, and holding lookup, and keep duplicated markup small and local.
- [Risk] Removing the top-level discipline header can make sorting controls less obvious on desktop. → Put subtle labels and sort affordances directly above expanded holding rows so sorting is scoped to the data users are viewing.
- [Risk] Reintroducing account edit UI could accidentally restore old row-level actions. → Add the edit action only in the expanded detail action strip and keep the main account row unchanged.
