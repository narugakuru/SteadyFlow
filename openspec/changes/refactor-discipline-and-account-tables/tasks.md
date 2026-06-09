## 1. Dashboard Discipline Table

- [ ] 1.1 Refactor desktop discipline table to four columns: asset class, reference metric, market value, holding P&L.
- [ ] 1.2 Remove discipline status/action column, status badges, and visible adjustment/sort actions from main rows.
- [ ] 1.3 Render expanded discipline holdings with four-column semantics: holding identity, current price, market value, holding P&L.
- [ ] 1.4 Add a holding detail drawer for discipline holding rows with shares, cost, weight, P&L, memo, buy, sell, and edit actions.
- [ ] 1.5 Simplify mobile discipline cards by removing status/suggestion presentation while keeping readable value and P&L.

## 2. Accounts Page

- [ ] 2.1 Replace the account table with a headerless compact account list.
- [ ] 2.2 Sort account rows by total account value converted into the current display currency, descending.
- [ ] 2.3 Preserve top business controls: add account, update prices, and show zero-market-value holdings.
- [ ] 2.4 Create AccountHoldingTable for expanded account holdings with columns: holding, shares, current price, cost price, market value, P&L.
- [ ] 2.5 Render account holding rows as single-line data rows without current-price daily change.

## 3. Documentation Sync

- [ ] 3.1 Update main OpenSpec specs for dashboard, account-management, and mobile-responsive.
- [ ] 3.2 Update `project_overview.md` progress log for this functional UI change.

## 4. Verification

- [ ] 4.1 Run lint and typecheck.
- [ ] 4.2 Verify OpenSpec change status is complete.
- [ ] 4.3 Review changed files and commit only this task's files.
