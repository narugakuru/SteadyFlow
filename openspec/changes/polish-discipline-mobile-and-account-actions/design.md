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

3. **Separate summary row hierarchy from holding row density.**

   Category summary rows will use a taller two-line composition: large bold category name on the left, enlarged progress bar in the center, and right-aligned market value with PnL on the second line. Expanded holding rows stay strictly single-line on desktop; the first column places stock name, ticker, and account badge on one horizontal line, while the remaining numeric columns use compact right alignment and are biased toward the right side of the row.

   Alternative considered: make holding identity two-line like the account table. That makes the expanded area feel taller and conflicts with the user's intended single-line scan pattern for holdings.

4. **Restore account editing as an expanded-detail action, not a row-level icon.**

   The account list remains headerless and minimal. Clicking an account expands details, where "编辑账户" appears after "新建持仓". This keeps the main row visually quiet while restoring the account edit workflow.

5. **Align mobile holding detail priority with the requested scan order.**

   Mobile discipline holding cards will keep the independent card renderer, but the detail grid will prioritize current price and PnL on the first row: current price on the left, PnL on the right. Cost price and shares move to the second row.

6. **Use an explicit large red close control in the holding Drawer.**

   The discipline holding side panel will hide the default small Sheet close affordance and render an explicit close button styled as a large red X, matching the visual emphasis used by buy/sell dialogs.

7. **Reuse the dashboard holding table language for account expanded holdings.**

   The account expanded holding table will use the same single-line row density, fixed six-column layout, and right-aligned numeric column treatment as the dashboard expanded holding table. Because the account page has no holding Drawer in this flow, row click behavior will remain non-interactive; the change is visual and sorting-focused.

   Header sorting will be local to each `AccountHoldingTable` instance and cycle `desc -> asc -> default`. Numeric comparisons will use the currently displayed amount currency for market value and PnL, while text sorting will use the rendered holding identity.

## Risks / Trade-offs

- [Risk] Separate desktop/mobile discipline renderers can duplicate formatting code. → Keep shared helper functions for currency, PnL color, and holding lookup, and keep duplicated markup small and local.
- [Risk] Removing the top-level discipline header can make sorting controls less obvious on desktop. → Put subtle labels and sort affordances directly above expanded holding rows so sorting is scoped to the data users are viewing.
- [Risk] Reintroducing account edit UI could accidentally restore old row-level actions. → Add the edit action only in the expanded detail action strip and keep the main account row unchanged.
- [Risk] Custom Drawer close controls can duplicate Radix default close behavior. → Hide the built-in close button for this Drawer and wire the explicit red X to the same open-state callback.
- [Risk] Account table sorting can conflict with account-level value sorting. → Scope sorting only to holdings inside the expanded account; account list order remains unchanged.
