## Context

The existing quote refresh endpoint and its shared service are used by manual Dashboard updates, the batch-update page, silent client refresh, and daily cron net value recording. The current candidate set is broader than the user's actual active positions because it includes every shares-mode holding with a recognizable ticker. Sold-out holdings that remain in the database can therefore still consume quote-provider requests and appear in update results.

Holdings already carry `valuationMode`, `ticker`, `shares`, `price`, and `marketValue`. No schema change is needed to distinguish an active stock position: shares-mode holdings with a positive `shares` value are current stock holdings; shares-mode holdings with `shares <= 0`, missing shares, or invalid shares are not current holdings for quote refresh.

## Goals / Non-Goals

**Goals:**

- Restrict all automatic quote refresh entry points to active shares-mode holdings only.
- Keep the existing response shape: `updated`, `failed`, and `skipped`.
- Report sold-out shares-mode holdings as skipped rather than failed.
- Preserve exchange-rate refresh behavior even when no holdings qualify for quote refresh.

**Non-Goals:**

- Change holding storage, transaction behavior, or sold-out holding retention.
- Add a new user setting for quote refresh scope.
- Change quote-provider selection or fallback order.
- Stop showing non-held holdings on pages that intentionally include them.

## Decisions

- Filter quote candidates in the shared quote sync service, not in individual UI callers.
  - Rationale: Dashboard, batch-update, silent refresh, and cron already reuse the shared path; a service-level filter guarantees consistent behavior.
  - Alternative considered: filter only on the batch-update page. That would not fix Dashboard, silent refresh, or cron.

- Use `valuationMode === "shares"` plus `shares > 0` as the active-holding predicate.
  - Rationale: share balance is the direct indicator of whether a stock is currently held. `marketValue` can be stale or zero when a user is trying to recover a missing quote, so it is not a safe active-position gate.
  - Alternative considered: require `marketValue > 0`. That would incorrectly skip positions with positive shares but missing or zero old price.

- Return non-active shares-mode holdings in `skipped` with a clear reason.
  - Rationale: the API contract already exposes skipped rows for non-eligible holdings. Keeping sold-out rows in `skipped` maintains transparency without treating them as errors.
  - Alternative considered: omit them entirely. That would reduce noise but make result counts less explainable when users compare them with visible holdings.

## Risks / Trade-offs

- Sold-out holdings may still appear in the batch-update page when the page is configured to show them, but their quote refresh status will be skipped. → Use a clear skip reason so the behavior is visible and non-error.
- Existing tests may only cover amount-mode skips. → Add regression coverage for shares-mode holdings with zero shares.
- Some historical data may have `shares` stored as null or non-numeric text. → Treat non-positive or non-finite parsed values as non-active and skip safely.
