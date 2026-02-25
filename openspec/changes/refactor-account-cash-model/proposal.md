## Why

当前账户模型中 `totalBalance` 语义混乱：交易系统将其当作"现金余额"操作（买入扣减、卖出增加），但 UI 将其当作"账户总额/市值"展示。这导致：
1. 股价上涨时账户总价值不会变化，盈亏计算错误
2. 现金 = `totalBalance - holdingsValue` 在买入后变为负数，被 `Math.max(0)` 静默截断
3. 账户盈亏 = `totalBalance - totalCost` 实际是"现金 - 本金"，完全不反映投资收益

需要将 `totalBalance` 明确为"现金余额"（`cashBalance`），账户总价值改为实时计算 `cashBalance + Σ(holdings.marketValue)`。

## What Changes

- **BREAKING** `accounts.totalBalance` 字段重命名为 `accounts.cashBalance`，语义明确为"现金余额"
- 账户总价值改为实时计算：`accountValue = cashBalance + holdingsValue`
- 账户盈亏改为：`pnl = accountValue - totalCost`
- 新建账户时只填初始现金（`cashBalance`），不再填"市值/总额"
- 资产配置总资产计算改为 `Σ(cashBalance + holdingsValue)` 的 CNY 折算
- 批量更新页面移除账户总额编辑，只保留持仓股价/市值更新
- 快照数据中的 `totalCny` 改用正确的账户总价值计算
- 数据库迁移：将现有 `totalBalance` 数据转换为正确的 `cashBalance`（`totalBalance - holdingsValue`）

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `account-management`: 字段从 totalBalance 改为 cashBalance，创建/编辑表单只填现金，账户总价值和盈亏改为实时计算
- `transaction-management`: 交易副作用改为操作 cashBalance 而非 totalBalance
- `asset-allocation`: 总资产计算公式改为 cashBalance + holdingsValue，现金计算直接用 cashBalance
- `batch-update`: 移除账户总额编辑功能，只保留持仓市值/股价更新
- `daily-snapshot`: 快照中账户总额改用 cashBalance + holdingsValue 计算
- `holding-management`: 删除持仓时不再需要"现金恢复"逻辑（现金是独立字段，不受持仓市值影响）

## Impact

- 数据库 schema 变更：`accounts.total_balance` → `accounts.cash_balance`
- 需要数据迁移脚本：遍历所有账户，`cashBalance = totalBalance - Σ(该账户持仓市值)`
- 影响的 API：accounts CRUD、transactions POST、asset-allocation GET、batch-update PUT、snapshots POST
- 影响的前端组件：account-list.tsx、account-form、batch-update/page.tsx、asset-allocation 相关组件
- 类型定义变更：Account interface 中 totalBalance → cashBalance，移除 cash 计算字段
