## 1. Application Shell And Navigation

- [ ] 1.1 Replace the top navigation layout with a shared authenticated app shell that renders a desktop left sidebar and right main-content area.
- [ ] 1.2 Add sidebar navigation items for 总览, 洞察, 账户, 活动, 净值, and admin-only 管理, using text labels without new icon design.
- [ ] 1.3 Move the Settings entry to the lower-left sidebar area and wire it to the existing settings dialog.
- [ ] 1.4 Ensure login and register routes do not render the authenticated app shell.
- [ ] 1.5 Implement mobile navigation behavior for the new shell without covering or clipping page content.
- [ ] 1.6 Update active-route highlighting so `/`, `/insights`, `/accounts`, `/transactions`, `/netvalue`, and `/admin` highlight the correct sidebar item.

## 2. Page Decommissioning

- [ ] 2.1 Remove Market and Stock Price Update from all navigation surfaces.
- [ ] 2.2 Decommission `/market` so direct visits no longer render the old market page.
- [ ] 2.3 Decommission `/batch-update` so direct visits no longer render the old stock price update page.
- [ ] 2.4 Keep `POST /api/holdings/fetch-prices`, silent quote refresh, and Cron quote refresh behavior working after the page removal.
- [ ] 2.5 Remove or leave unused market/batch UI-only components according to actual import usage, without deleting shared quote/data-source services still in use.

## 3. Overview Refactor

- [ ] 3.1 Add a reusable overview asset trend chart using existing `GET /api/netvalue/chart?range=...` data.
- [ ] 3.2 Render the trend chart as a green-filled area chart with range controls for `30d`, `90d`, `1y`, `3y`, and `all`.
- [ ] 3.3 Add the overview headline block showing total assets, account total P&L amount, and current snapshot P&L percentage.
- [ ] 3.4 Implement the P&L percentage denominator as `totalAssetCny - totalPnl`, with `--` fallback for invalid denominators.
- [ ] 3.5 Remove the asset distribution pie chart from the default Dashboard/overview layout.
- [ ] 3.6 Keep the asset allocation discipline table below the overview chart and preserve existing expand/edit/trade/sort behaviors.
- [ ] 3.7 Keep rebalance suggestions below the discipline table and preserve existing display-currency behavior.
- [ ] 3.8 Keep Dashboard manual quote refresh available without linking to `/batch-update`.
- [ ] 3.9 Add loading, error, and insufficient-history empty states for the overview chart area.

## 4. Insights Data Model

- [ ] 4.1 Add a server-side insights read model or route that returns summary, currency composition, account composition, asset-class composition, heatmap holdings, rates, and color mode for the current user.
- [ ] 4.2 Reuse existing portfolio snapshot, account breakdown, allocation, exchange-rate, and settings logic instead of recalculating currency conversion in the client.
- [ ] 4.3 Ensure insights data excludes zero-market-value holdings from heatmap layout.
- [ ] 4.4 Ensure amount-mode holdings use `marketValue` and `cost`, and shares-mode holdings use `shares * price` value semantics already persisted in `marketValue`.
- [ ] 4.5 Add or update TypeScript types for the insights response.

## 5. Insights Page UI

- [ ] 5.1 Create `/insights` page with cache-aware data loading and authenticated user data isolation.
- [ ] 5.2 Add currency composition chart based on current total assets in a common base currency.
- [ ] 5.3 Add account composition chart based on each account's current total value.
- [ ] 5.4 Add asset-class composition chart using the same allocation data口径 as the discipline table.
- [ ] 5.5 Add a current holdings heatmap where block size is current market value and color is current P&L percentage.
- [ ] 5.6 Show holding name or ticker plus P&L percentage only when the heatmap block has enough space.
- [ ] 5.7 Add heatmap Tooltip/details showing holding name, account, market value, P&L amount, and P&L percentage.
- [ ] 5.8 Add empty states for no accounts, zero total assets, and no nonzero holdings.

## 6. Styling And Responsiveness

- [ ] 6.1 Apply Wealthfolio-inspired dark/neutral layout styling and restrained green chart fill to the shell, overview, and insights surfaces.
- [ ] 6.2 Ensure text does not overflow sidebar items, chart controls, cards, heatmap blocks, or action buttons across desktop and mobile widths.
- [ ] 6.3 Verify account, activity, net value, and admin pages remain usable inside the new shell without major workflow changes.
- [ ] 6.4 Preserve user `colorMode` semantics for positive/negative P&L colors in overview and insights.

## 7. Documentation And Spec Sync

- [ ] 7.1 Update `project_overview.md` progress log with the UI refactor implementation summary after code changes.
- [ ] 7.2 Update `openspec/project.md` for route/layout changes and any new `/api/insights` route.
- [ ] 7.3 Sync implemented behavior to relevant main specs under `openspec/specs` as required by project collaboration rules.
- [ ] 7.4 Keep the change delta specs coherent with implementation decisions if direct route decommissioning uses redirects rather than deleted pages.

## 8. Verification

- [ ] 8.1 Run `openspec status --change refactor-wealthfolio-style-ui` and ensure the change remains apply-ready during implementation.
- [ ] 8.2 Run `npm run typecheck`.
- [ ] 8.3 Run `npm run lint`.
- [ ] 8.4 Start the local dev server and verify 总览, 洞察, 账户, 活动, 净值, 管理, 设置, and removed page direct visits in the browser.
- [ ] 8.5 Capture desktop and mobile screenshots for the new shell, overview, and insights page to check layout, chart rendering, and text overflow.
