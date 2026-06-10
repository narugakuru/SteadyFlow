## 1. Account Detail Actions

- [x] 1.1 Reintroduce account edit dialog state and rendering without restoring row-level account edit controls.
- [x] 1.2 Add an "编辑账户" action after "新建持仓" in the expanded account detail action area.

## 2. Dashboard Discipline Desktop

- [x] 2.1 Remove the dashboard discipline table top-level desktop header.
- [x] 2.2 Replace expanded desktop holding rows with a subtle six-column holding table: 标的、份额、现价、成本价、市值、盈亏.
- [x] 2.3 Preserve discipline holding click behavior, detail Drawer, buy/sell/edit flows, and existing sorting state.

## 3. Dashboard Discipline Mobile

- [x] 3.1 Split discipline expanded holding rendering into desktop table and mobile card renderers.
- [x] 3.2 Restore mobile expanded holding cards with asset identity, market value, allocation percent, PnL, current price, cost price, and shares.
- [x] 3.3 Preserve mobile discipline sorting auxiliary bar and remove status suggestions from mobile cards.

## 4. Documentation And Verification

- [x] 4.1 Sync implemented behavior into `openspec/specs/dashboard`, `openspec/specs/account-management`, and `openspec/specs/mobile-responsive`.
- [x] 4.2 Update `project_overview.md` progress log.
- [x] 4.3 Run lint and typecheck.

## 5. Discipline Desktop Layout Correction

- [ ] 5.1 Update desktop category summary rows to a taller two-line layout with large category name, enlarged center progress bar, and right-side market value plus PnL.
- [ ] 5.2 Update desktop expanded holding rows so stock name, ticker, and account badge are on the same line.
- [ ] 5.3 Adjust desktop expanded holding columns so numeric data stays single-line, right-aligned, and visually gathered toward the right.
- [ ] 5.4 Sync corrected layout requirements to main specs and project overview, then run lint and typecheck.
