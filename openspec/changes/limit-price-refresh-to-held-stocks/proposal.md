## Why

The stock price refresh flow currently attempts to refresh every shares-mode holding with a recognizable ticker, including positions that no longer have an active share balance or market value. Updating quotes for non-held stocks wastes provider quota, slows manual and background sync, and produces noisy results for positions the user no longer owns.

## What Changes

- Limit automatic quote refresh to current active holdings only.
- Treat shares-mode holdings with no positive share balance as non-held and skip them during quote refresh.
- Keep manual, silent-client, and cron quote sync paths on the same core behavior and result shape.
- Preserve exchange-rate refresh checks even when all quote candidates are skipped.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `auto-quote-fetch`: automatic quote refresh only updates current active holdings and skips non-held stocks.
- `batch-update`: the batch update page's automatic quote button follows the same active-holding-only refresh scope.

## Impact

- Affects `POST /api/holdings/fetch-prices` and shared quote sync service behavior.
- Affects Dashboard, batch-update page, silent refresh, and daily cron quote sync results.
- No database schema or dependency changes.
