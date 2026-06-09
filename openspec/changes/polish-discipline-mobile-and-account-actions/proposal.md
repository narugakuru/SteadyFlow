## Why

The recent discipline table and account list refactor improved information density, but a few interaction and responsive details no longer match the intended product shape. The account edit path became too hidden, the dashboard discipline table still exposes a redundant top header, and mobile discipline holdings lost their card-oriented layout.

## What Changes

- Restore an explicit account edit entry in the expanded account detail actions, placed after the existing "新建持仓" action.
- Remove the dashboard discipline table's top-level desktop header entirely so category summary rows read as the primary list.
- Change expanded dashboard discipline holdings on desktop to use the same six-column information model as the account holding table: 标的、份额、现价、成本价、市值、盈亏.
- Add a subtle per-category holding header inside each expanded discipline category before the holding rows.
- Restore mobile discipline holding details to independent card-style UI and keep mobile sorting/header affordances, instead of rendering desktop-like data rows on narrow screens.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `dashboard`: Discipline table top-level header and expanded holding presentation requirements change.
- `account-management`: Expanded account detail actions must include account editing.
- `mobile-responsive`: Mobile discipline expanded holdings must remain card-based and separate from desktop data-table rendering.

## Impact

- Affected UI components: `src/components/discipline-table.tsx`, `src/components/account-list.tsx`, and related holding table presentation code.
- No API, database, migration, or dependency changes.
- Specs to sync after implementation: `dashboard`, `account-management`, and `mobile-responsive`.
