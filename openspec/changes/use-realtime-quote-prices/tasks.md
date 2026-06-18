## 1. Data Source Price Selection

- [x] 1.1 Update Yahoo Finance quote parsing to choose pre-market, post-market, or regular current price by market state and never use previous-close fields.
- [x] 1.2 Update EODHD fallback to rely only on realtime batch quotes and remove historical EOD previous-close fallback.
- [x] 1.3 Update Twelve Data fallback to reject `previous_close` when no current `close` or `price` is available.

## 2. Quote Sync Result Semantics

- [x] 2.1 Ensure `POST /api/holdings/fetch-prices` updated results no longer return `source=previous_close` for newly fetched quotes.
- [x] 2.2 Keep failed holdings unchanged and return clear errors when only previous-close data is available.
- [x] 2.3 Adjust the quote result dialog copy if needed so successful rows no longer imply previous-close updates are expected.

## 3. Verification

- [x] 3.1 Add focused tests for Yahoo pre/post/regular field selection and previous-close rejection.
- [x] 3.2 Add focused tests for EODHD and Twelve Data previous-close rejection.
- [x] 3.3 Run targeted tests plus `npm run typecheck`.

## 4. Documentation And Specs

- [x] 4.1 Sync implemented behavior into main `openspec/specs`.
- [x] 4.2 Update `project_overview.md` progress log and technical summary if needed.
