## 1. Account Detail Actions

- [ ] 1.1 Reintroduce account edit dialog state and rendering without restoring row-level account edit controls.
- [ ] 1.2 Add an "编辑账户" action after "新建持仓" in the expanded account detail action area.

## 2. Dashboard Discipline Desktop

- [ ] 2.1 Remove the dashboard discipline table top-level desktop header.
- [ ] 2.2 Replace expanded desktop holding rows with a subtle six-column holding table: 标的、份额、现价、成本价、市值、盈亏.
- [ ] 2.3 Preserve discipline holding click behavior, detail Drawer, buy/sell/edit flows, and existing sorting state.

## 3. Dashboard Discipline Mobile

- [ ] 3.1 Split discipline expanded holding rendering into desktop table and mobile card renderers.
- [ ] 3.2 Restore mobile expanded holding cards with asset identity, market value, allocation percent, PnL, current price, cost price, and shares.
- [ ] 3.3 Preserve mobile discipline sorting auxiliary bar and remove status suggestions from mobile cards.

## 4. Documentation And Verification

- [ ] 4.1 Sync implemented behavior into `openspec/specs/dashboard`, `openspec/specs/account-management`, and `openspec/specs/mobile-responsive`.
- [ ] 4.2 Update `project_overview.md` progress log.
- [ ] 4.3 Run lint and typecheck.
