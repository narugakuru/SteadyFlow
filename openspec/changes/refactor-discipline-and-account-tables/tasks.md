## 1. Dashboard Discipline Table

- [x] 1.1 Refactor desktop discipline table to four columns: asset class, reference metric, market value, holding P&L.
- [x] 1.2 Remove discipline status/action column, status badges, and visible adjustment/sort actions from main rows.
- [x] 1.3 Render expanded discipline holdings with four-column semantics: holding identity, current price, market value, holding P&L.
- [x] 1.4 Add a holding detail drawer for discipline holding rows with shares, cost, weight, P&L, memo, buy, sell, and edit actions.
- [x] 1.5 Simplify mobile discipline cards by removing status/suggestion presentation while keeping readable value and P&L.

## 2. Accounts Page

- [x] 2.1 Replace the account table with a headerless compact account list.
- [x] 2.2 Sort account rows by total account value converted into the current display currency, descending.
- [x] 2.3 Preserve top business controls: add account, update prices, and show zero-market-value holdings.
- [x] 2.4 Create AccountHoldingTable for expanded account holdings with columns: holding, shares, current price, cost price, market value, P&L.
- [x] 2.5 Render account holding rows as single-line data rows without current-price daily change.

## 3. Documentation Sync

- [x] 3.1 Update main OpenSpec specs for dashboard, account-management, and mobile-responsive.
- [x] 3.2 Update `project_overview.md` progress log for this functional UI change.

## 4. Verification

- [x] 4.1 Run lint and typecheck.
- [x] 4.2 Verify OpenSpec change status is complete.
- [x] 4.3 Review changed files and commit only this task's files.
