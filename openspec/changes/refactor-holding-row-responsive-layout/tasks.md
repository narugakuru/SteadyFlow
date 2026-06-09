## 1. Menu Foundation

- [x] 1.1 Add or reuse a lightweight menu primitive for row actions using the existing Radix dependency surface.
- [x] 1.2 Ensure the menu trigger supports compact desktop sizing and at least 44x44 touch target on mobile.

## 2. HoldingRow Refactor

- [x] 2.1 Refactor desktop HoldingRow into a single-row six-column data grid.
- [x] 2.2 Right-align desktop numeric columns for shares, prices, value/weight, and P&L.
- [x] 2.3 Refactor mobile HoldingRow into a high-density info card with header, value/weight hero area, and compact detail grid.
- [x] 2.4 Move buy, sell, and edit actions into the `...` menu while preserving transaction and edit dialog defaults.
- [x] 2.5 Keep account-page delete behavior as an independent trash icon rendered only for `actions="full"`.
- [x] 2.6 Preserve memo display, account-name badges, display-currency conversion, and P&L color semantics.

## 3. Documentation Sync

- [x] 3.1 Update main OpenSpec specs for dashboard, account-management, and mobile-responsive.
- [x] 3.2 Update `project_overview.md` progress log for this functional UI change.

## 4. Verification

- [x] 4.1 Run lint and typecheck.
- [x] 4.2 Verify the OpenSpec change status is apply-ready/complete for generated artifacts.
- [x] 4.3 Review changed files and commit only this task's files.
