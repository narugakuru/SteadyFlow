## Why

当前交易的 `affectBalance` 是单一开关，控制所有副作用（现金 + 持仓）。用户录入已有持仓时遇到困境：开启则扣现金（不合理），关闭则持仓数据也不更新（无用）。需要拆分为两个独立开关，让用户精确控制交易对现金和持仓的影响。

## What Changes

- **BREAKING** `transactions.affect_balance` 单字段拆分为 `affect_cash` + `affect_holding` 两个布尔字段
- 交易表单中"影响账户余额"单开关改为"影响账户现金"和"影响持仓数据"两个独立开关
- 交易 API 副作用逻辑拆分：现金操作受 `affectCash` 控制，持仓操作受 `affectHolding` 控制
- 交易记录列表展示适配新字段

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `transaction-management`: affectBalance 拆分为 affectCash + affectHolding，交易副作用独立控制

## Impact

- 数据库 schema 变更：`transactions.affect_balance` → `affect_cash` + `affect_holding`
- 需要数据迁移：已有记录的 `affect_balance` 值同时赋给 `affect_cash` 和 `affect_holding`
- 影响的 API：transactions POST
- 影响的前端组件：transaction-form.tsx、transactions/page.tsx（列表展示）
- 类型定义变更：Transaction interface
