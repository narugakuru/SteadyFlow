## Why

当前账户模型中 `totalCost`（本金）字段与持仓 `cost` 存在语义重叠，且本金在实际使用中缺乏明确意义——用户真正关心的是"持仓赚了多少"，而非"账户总投入多少"。删除本金字段可简化数据模型和 UI，同时将盈亏语义统一为"持仓盈亏"（Σ 各持仓的 marketValue - cost），更直观准确。

## What Changes

- **BREAKING** 删除 accounts 表的 `totalCost` 字段
- 账户列表表头删除"本金"列
- 添加/编辑账户表单删除"账户本金"输入项
- 账户列表的"盈亏"列改为"持仓盈亏"，计算方式改为 Σ(holding.marketValue - holding.cost)，不再依赖 totalCost
- 总览页（Dashboard）纪律表的"盈亏"列标题改为"持仓盈亏"（计算逻辑不变，本身就是按持仓计算的）
- 账户 API（GET/POST/PUT）移除 totalCost 相关逻辑

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `account-management`: 删除 totalCost 字段、删除本金列和表单项、盈亏改为持仓盈亏（Σ 持仓盈亏）
- `dashboard`: 纪律表盈亏列标题改为"持仓盈亏"

## Impact

- 数据模型：accounts 表删除 `totalCost` 列（SQLite + PG 两套 schema 同步修改，需数据库迁移）
- API：`/api/accounts` GET 返回值移除 totalCost，新增 holdingsPnl；POST/PUT 不再接受 totalCost 参数
- 前端组件：`account-list.tsx`（表头、表单、盈亏计算）、`discipline-table.tsx`（列标题）
- 类型定义：`types.ts` 中 Account 类型移除 totalCost，新增 holdingsPnl
- 交易副作用：交易 API 中涉及 totalCost 更新的逻辑需移除
