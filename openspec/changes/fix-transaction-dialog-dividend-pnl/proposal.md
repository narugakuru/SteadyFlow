## Why

当前交易弹窗在切换买入/卖出/股息时会清空已选账户与标的，且买卖价格未自动带出持仓现价，导致用户重复操作、易出错；同时股息交易未计入了结盈亏，导致收益口径与用户认知不一致。该问题直接影响高频录单体验与收益统计准确性，需要优先修复。

## What Changes

- 调整交易弹窗状态管理：切换买入/卖出/股息时保持已选账户和持仓不变，不再强制清空。
- 交易弹窗新增股价自动填充：买入/卖出在选择持仓后自动带出该持仓记录价格，用户可按需手动覆盖。
- 修正了结盈亏口径：股息交易在“影响账户现金”开启时，按 `amount - fee` 计入交易 `realizedPnl` 并增量计入账户累计 `realizedPnl`。
- 删除交易时继续沿用现有对称回退逻辑，确保删除已计入股息交易后账户累计了结盈亏同步扣减。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `transaction-management`: 调整交易表单交互（类型切换保留选择、买卖自动带出价格）并扩展股息交易的 `realizedPnl` 计算与入账规则。
- `realized-pnl-ledger`: 将“可计入了结盈亏的交易类型”从仅卖出扩展为“卖出 + 股息（受开关约束）”。

## Impact

- 前端：`src/components/transaction-form.tsx`。
- 后端：`src/app/api/transactions/route.ts`（创建交易路径的 `realizedPnl` 计算与账户累计更新）。
- 规格：`openspec/specs/transaction-management/spec.md`、`openspec/specs/realized-pnl-ledger/spec.md`。
- 无新增第三方依赖，无数据库 schema 变更。
