## Context

交易 API（`src/app/api/transactions/route.ts`）在处理 shares 模式的买入/卖出副作用时，使用 `holding.price` 计算新市值。但新建持仓的 `price` 默认为 0，首次买入时 `marketValue = newShares * 0 = 0`，导致持仓市值不更新。卖出同理。

当前代码（buy case，line 147-156）：
```typescript
const newShares = holding.shares + parseFloat(txShares);
await db.update(holdings).set({
  cost: holding.cost + finalAmount,
  shares: newShares,
  marketValue: newShares * holding.price,  // ← holding.price 为 0
  updatedAt: now,
});
```

## Goals / Non-Goals

**Goals:**
- 修复 shares 模式首次买入/卖出时市值为 0 的 bug
- 买入/卖出时同步更新 `holding.price` 为交易成交价
- 修正 spec 中的市值计算公式描述

**Non-Goals:**
- 不改变 amount 模式的任何逻辑
- 不改变交易表单 UI
- 不引入加权平均价格计算（直接用最新成交价作为当前价格）

## Decisions

**Decision 1: 买入/卖出时用 txPrice 更新 holding.price**

交易成交价代表最新市场价格，应同步更新到持仓的 `price` 字段。市值计算改为 `newShares * newPrice`，其中 `newPrice` 优先取 `txPrice`，fallback 到 `holding.price`。

替代方案：只在 `holding.price === 0` 时才用 txPrice → 不够合理，每次交易都应反映最新价格。

**Decision 2: 修改范围最小化**

只改 `route.ts` 中 buy/sell 两个 case 的 shares 分支，各加一行 `price: newPrice`，修改 `marketValue` 计算。总共改动约 6 行代码。

## Risks / Trade-offs

- [Risk] 用最新成交价覆盖 holding.price，如果用户在批量更新页面手动设了价格，下次交易会覆盖 → 这是合理行为，交易价格比手动设置更准确
- [Risk] 如果交易没传 txPrice（理论上 shares 模式必传）→ fallback 到 holding.price，不会比现在更差
