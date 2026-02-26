## Why

Shares 模式持仓首次买入时，交易 API 使用 `holding.price`（初始为 0）计算市值 `newShares * holding.price`，导致扣除了现金但持仓市值仍为 0。卖出同理存在此问题。这是一个影响核心资产计算的严重 bug。

## What Changes

- 修复买入/卖出副作用中 shares 模式的市值计算：使用交易成交价 `txPrice` 更新 `holding.price`，再用新价格计算 `marketValue`
- 修正 spec 中 shares 模式买入/卖出的市值计算公式，明确 `holding.price` 应随交易更新

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `transaction-management`: 修正 shares 模式买入/卖出副作用的市值计算逻辑——买入/卖出时应使用交易成交价更新 `holding.price`，再计算 `marketValue = shares × price`

## Impact

- `src/app/api/transactions/route.ts`：buy 和 sell case 中 shares 模式的 `.set()` 逻辑
- `openspec/specs/transaction-management/spec.md`：修正 shares 模式买入/卖出 scenario 的市值公式描述
