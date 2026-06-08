## Why

The current application exposes too many top-level pages for a personal portfolio workflow, and the Dashboard still presents older chart-heavy structure instead of the focused Wealthfolio-style overview the product now needs. This change refactors the primary UI around a left navigation shell, a visual overview page, and a dedicated insights page while keeping the existing asset discipline, amount-mode holdings, accounts, activities, net value, and admin workflows intact.

## What Changes

- **BREAKING**: Remove the user-facing Market page (`/market`) from the primary product surface.
- **BREAKING**: Remove the user-facing Stock Price Update page (`/batch-update`) from the primary product surface.
- Replace the top navigation bar with a left sidebar + right main-content shell.
- Sidebar top-level items become: 总览, 洞察, 账户, 活动, 净值, 管理; 管理 is visible only to admin users.
- Move Settings to the lower-left sidebar area and keep it as the current settings dialog entry.
- Add a new 洞察 page for portfolio composition charts and a holdings heatmap.
- Refactor 总览 to use a Wealthfolio-like visual hierarchy:
  - a large green-filled asset trend chart area;
  - total asset value and current account total P&L summary in the chart's upper-left area;
  - chart range controls below the chart;
  - asset allocation discipline table and rebalance suggestions below the chart.
- Use existing net value history as an asset-value trend source for this change. Accurate historical P&L/TWR/IRR curves are explicitly out of scope.
- Hide or move the existing asset distribution pie chart out of 总览; composition belongs on 洞察.
- Preserve existing account, activity/transaction, net value, and admin page business behavior with only shell/navigation-level integration changes.
- Treat `valuationMode="amount"` holdings as first-class throughout the new overview and insights UI; amount-mode assets use stored market value and cost, not `shares * price`.
- Keep background/manual quote refresh infrastructure available where still needed, but do not expose a standalone stock update page.

## Capabilities

### New Capabilities

- `portfolio-insights`: Defines the new 洞察 page, including currency/account/asset-class composition charts and a current-holdings heatmap.

### Modified Capabilities

- `navigation-layout`: Replace top navigation with the sidebar shell, remove Market and Stock Price Update navigation, add Insights, rename Transactions navigation to Activities, and keep admin-only Management visibility.
- `dashboard`: Refactor 总览 into the Wealthfolio-style overview with asset trend chart, P&L summary, asset discipline, and rebalance suggestions; remove the asset distribution chart from the default overview.
- `visualization-charts`: Add overview asset trend chart behavior and insights chart/heatmap expectations while keeping existing net value chart behavior.
- `asset-allocation`: Clarify that amount-mode holdings remain first-class in discipline and insights calculations.
- `rebalance-suggestion`: Keep rebalance suggestions on 总览 below the discipline table in the new layout.
- `portfolio-chart`: Re-scope asset distribution visualization away from the 总览 default surface and toward 洞察 or future optional views.
- `batch-update`: Decommission the standalone `/batch-update` page while preserving quote refresh APIs and shared result handling where used.
- `auto-quote-fetch`: Remove the batch-update page quote button requirement while preserving Dashboard/manual, silent-client, and Cron quote refresh paths.
- `market-overview`: Decommission the standalone `/market` page from the app surface.
- `market-chart-widget`: Decommission VIX chart requirements tied to the removed Market page.
- `market-ath-drawdown`: Decommission ATH drawdown requirements tied to the removed Market page.
- `mobile-responsive`: Define responsive behavior for the new shell so navigation remains usable on narrow screens.

## Impact

- Frontend shell and layout:
  - `src/app/layout.tsx`
  - `src/components/navbar.tsx` or replacement shell/sidebar components
  - `src/components/page-container.tsx`
- Pages:
  - `src/app/page.tsx`
  - new `src/app/insights/page.tsx`
  - `src/app/accounts/page.tsx`
  - `src/app/transactions/page.tsx`
  - `src/app/netvalue/page.tsx`
  - `src/app/admin/page.tsx`
  - `src/app/market/page.tsx`
  - `src/app/batch-update/page.tsx`
- Data/API:
  - likely add an insights read model route or extend the existing portfolio snapshot read path;
  - no required database migration for the first implementation;
  - no historical performance/P&L snapshot table in this change.
- Visualization:
  - Recharts can continue as the charting dependency;
  - no new chart dependency is expected for the first implementation.
- Documentation/specs:
  - Update OpenSpec specs listed above.
  - Update `project_overview.md` and `openspec/project.md` after implementation.
