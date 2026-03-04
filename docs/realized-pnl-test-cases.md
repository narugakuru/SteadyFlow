# Realized PnL 变更测试用例（2026-03-04）

## 1. 交易创建与累计更新

1. 新增 `sell + affectHolding=true` 交易：校验交易 `realizedPnl` 写入且账户 `realizedPnl` 同步增加。
2. 新增 `sell + affectHolding=false` 交易：校验交易 `realizedPnl=0` 且账户累计不变。
3. 新增非 sell 交易（buy/dividend/deposit/withdraw）：校验交易 `realizedPnl=0`。

## 2. 交易删除与回退

1. 删除计入了结盈亏的卖出交易：校验账户 `realizedPnl` 按该交易值回退。
2. 删除 `affectHolding=false` 的卖出交易：校验账户 `realizedPnl` 不变化。
3. 删除任意交易：校验持仓与现金余额不被回滚。

## 3. 事务一致性

1. 模拟交易创建过程中账户更新失败：验证交易不会被部分写入。
2. 模拟交易删除过程中账户更新失败：验证删除回滚，交易记录保持存在。

## 4. Dashboard 展示

1. 总资产卡片显示三项指标：账户总盈亏、持仓盈亏、了结盈亏。
2. 账户总盈亏应等于持仓盈亏 + 了结盈亏。
3. 移动端下三项指标纵向堆叠，无重叠与裁切。

## 5. 迁移与历史数据

1. 迁移后 `accounts.realized_pnl` 和 `transactions.realized_pnl` 字段存在且默认值为 0。
2. 历史交易未做回填，`realized_pnl` 保持 0。
