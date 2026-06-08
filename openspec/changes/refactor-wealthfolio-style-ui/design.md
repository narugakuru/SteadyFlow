## Context

The current app uses a global top `Navbar`, a centered `PageContainer`, and several peer pages: Dashboard, Market, Accounts, Transactions, Net Value, Stock Price Update, and Admin. The Dashboard already has the core portfolio business data: total assets, realized P&L, unrealized P&L, asset allocation discipline, rebalance suggestions, quote sync metadata, amount-mode and shares-mode holdings, and display-currency projection.

The desired direction is a Wealthfolio-inspired product shell and overview. The app should feel like a focused portfolio tool rather than a set of independent utility pages. The reference is layout and hierarchy only: the product should keep its original white/light theme and existing palette, while two utility pages, Market and Stock Price Update, leave the primary surface. The accurate historical P&L/performance curve is intentionally deferred because the existing `netvalue` table stores asset-value snapshots, not cash-flow-adjusted investment performance.

## Goals / Non-Goals

**Goals:**

- Replace the top navigation with a left sidebar shell on desktop.
- Add a new Insights page for composition charts and a current holdings heatmap.
- Refactor Dashboard into a Wealthfolio-style overview while preserving the original light theme and palette:
  - large green-filled asset trend chart using existing net value history;
  - total assets and current account total P&L headline;
  - asset allocation discipline and rebalance suggestions.
- Preserve current amount-mode holding semantics across overview and insights.
- Preserve account, activity/transaction, net value, and admin business behavior.
- Remove Market and Stock Price Update as user-facing pages.
- Keep quote refresh infrastructure for Dashboard, silent refresh, and Cron.

**Non-Goals:**

- Do not implement a historical P&L/TWR/IRR/performance engine in this change.
- Do not add new market data providers.
- Do not introduce a new charting dependency unless Recharts proves insufficient.
- Do not redesign account, activity, net value, or admin internal workflows beyond shell/layout integration.
- Do not change the database schema for the first implementation.

## Decisions

### Use A Shared App Shell Instead Of A Page-Level Sidebar

Create or replace the current navigation with an application shell rendered from `src/app/layout.tsx` for authenticated routes. The shell owns:

- desktop left sidebar;
- mobile navigation fallback;
- right-side content area;
- settings dialog state;
- admin-only navigation visibility.

This keeps each page focused on content and avoids duplicating sidebar layout across pages.

Alternative considered: implement a sidebar inside each page. This would reduce initial shell work but would make route transitions, settings, and mobile behavior inconsistent.

### Preserve Existing Routes Where Business Behavior Is Stable

Use these product routes:

- `/` for 总览;
- `/insights` for 洞察;
- `/accounts` for 账户;
- `/transactions` for 活动;
- `/netvalue` for 净值;
- `/admin` for 管理.

The transaction route can remain `/transactions` while the navigation label changes to 活动. This avoids a compatibility route migration for the current transaction page. A future `/activities` alias can be added later if a URL rename becomes important.

### Decommission Market And Batch Update Pages But Keep Supporting Services

`/market` and `/batch-update` no longer appear in navigation and no longer serve as primary pages. Direct visits should not present the old feature screens. Implementation can use a redirect to `/` or remove the pages entirely; the user-facing contract is that the app no longer has Market or Stock Price Update pages.

The quote refresh API remains because it supports Dashboard manual refresh, Dashboard silent refresh, and Cron "price before net value" behavior. Amount-mode holdings continue to be skipped by quote refresh.

### Use Net Value History For The Overview Asset Trend

The overview chart uses `GET /api/netvalue/chart?range=...` and displays it as an asset-value trend. It must be labeled and implemented as an asset curve, not as investment performance. Supported ranges should initially reuse the existing fixed net value ranges: `30d`, `90d`, `1y`, `3y`, and `all`.

Accurate historical P&L remains out of scope because it requires cash-flow classification and more complete daily performance snapshots. The current headline P&L can still be shown as a current snapshot because `buildAllocationData` already returns total, realized, and unrealized P&L. Because the chart is still an asset curve, it should not render a profit-zero baseline or imply the Y axis is return/performance.

### Define Current P&L Percent As A Snapshot Metric

The overview headline P&L percent is a current snapshot metric, not a historical performance return. It should be derived from current total P&L and an estimated current principal:

```text
estimatedPrincipalCny = totalAssetCny - totalPnl
totalPnlPct = totalPnl / estimatedPrincipalCny
```

If the denominator is zero or invalid, show `--`. This keeps the UI useful without implying a full performance engine.

Alternative considered: use current non-cash holding cost as the denominator. That ignores realized P&L and cash, so it is less aligned with "account total P&L".

### Add A Focused Insights Read Model

Add a dedicated insights read path, preferably `GET /api/insights`, that reuses the existing portfolio snapshot service instead of recalculating in the client. The response should include:

- total summary;
- currency composition;
- account composition;
- asset-class composition;
- holdings heatmap points;
- rates and color mode settings needed for display.

The service can be derived from `buildPortfolioSnapshot`, `accountBreakdown`, allocation rows, and holdings/account data. No new persisted table is required.

Alternative considered: combine accounts, holdings, and allocation queries on the client. That would increase duplicated currency and P&L logic and make heatmap calculations easier to drift from the discipline table.

### Use Recharts For First-Version Charts

Recharts is already used by the app and supports the required chart families for the first implementation:

- AreaChart for the overview asset curve;
- PieChart/RadialBar-like composition displays for insights;
- Treemap or a small custom layout for the holdings heatmap.

Avoid adding D3 or another visualization dependency unless a Recharts Treemap cannot satisfy label, sizing, and responsive behavior requirements.

### Keep Amount Mode First-Class

Insights and overview calculations must not assume `shares * price`. For `valuationMode="amount"`, `marketValue` is authoritative and P&L is `marketValue - cost`. For `valuationMode="shares"`, total cost is `cost * shares`.

This mirrors the app's existing handling of domestic funds and cash-like products such as Alipay funds.

### Keep Visual Refactor Scoped

The Wealthfolio visual language should be applied most strongly to the shell, overview, and insights page, but only as layout guidance. The existing dense operational pages can be adapted to the new shell without a full UI rewrite in this change, and the current white/light palette should remain the default visual base. The overview asset curve can use a slightly deeper green line/fill, while insights composition charts should use a clearer, brighter palette and the heatmap should use softer red/green intensity levels rather than heavy saturated blocks.

## Risks / Trade-offs

- [Risk] Users may interpret the overview asset trend as true investment performance.  
  Mitigation: label it as asset value trend and keep historical P&L/performance wording out of the chart.

- [Risk] The current snapshot P&L percent can be imperfect when users make manual balance edits or withdraw realized gains.  
  Mitigation: treat it as a current snapshot metric and display `--` when the denominator is invalid; do not call it TWR, IRR, or performance.

- [Risk] Removing Market and Stock Price Update pages may break stale bookmarks.  
  Mitigation: direct visits can redirect to `/` or a relevant current page instead of rendering the old pages.

- [Risk] Insights heatmap labels can overlap on small holdings or mobile screens.  
  Mitigation: only show labels when a block is large enough; otherwise rely on tooltip/details.

- [Risk] A global shell can accidentally wrap login/register pages.  
  Mitigation: shell should be hidden on unauthenticated public routes or use route checks to keep login/register clean.

- [Risk] New green accent usage could create one-note color dominance or contrast issues if overapplied.
  Mitigation: keep semantic P&L colors tied to `colorMode`, retain the existing light theme, use restrained green fill for the chart, and verify mobile/desktop screenshots.
