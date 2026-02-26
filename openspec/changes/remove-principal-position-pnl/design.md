## Context

当前 accounts 表有 `totalCost`（本金）字段，用于计算账户盈亏（accountValue - totalCost）。但实际上持仓已有独立的 `cost` 字段，本金与持仓成本存在语义重叠。用户需求是：只关心持仓盈亏，不需要账户级别的本金概念。

涉及的代码路径：
- 数据模型：`src/db/schema-sqlite.ts` accounts 表 `totalCost` 字段
- API：`/api/accounts` GET（返回 totalCost）、POST（接受 totalCost）、PUT（接受 totalCost）
- API：`/api/transactions/route.ts` 交易副作用中可能更新 totalCost
- 前端：`account-list.tsx`（本金列、表单、盈亏计算）、`discipline-table.tsx`（盈亏列标题）
- 类型：`lib/types.ts` Account 接口

## Goals / Non-Goals

**Goals:**
- 删除 accounts 表 `totalCost` 字段，简化数据模型
- 账户盈亏改为"持仓盈亏"，计算方式：Σ(holding.marketValue - holding.cost)
- UI 上删除本金列和本金表单项
- 总览/账户页的"盈亏"统一改为"持仓盈亏"

**Non-Goals:**
- 不改变持仓级别的 cost 字段和盈亏计算逻辑
- 不改变资产配置 API 中按资产类别汇总的盈亏计算（本身就是按持仓算的）
- 不做数据迁移脚本（totalCost 数据直接丢弃）

## Decisions

### 1. 账户盈亏计算方式

**选择**：持仓盈亏 = Σ(holding.marketValue - holding.cost)

**理由**：直接从持仓数据派生，无需额外字段存储。与资产配置 API 中已有的持仓盈亏计算逻辑一致。

**替代方案**：保留 totalCost 但改为自动计算（Σ holding.cost）——增加复杂度且语义不如直接算盈亏清晰。

### 2. 数据库迁移策略

**选择**：通过 Drizzle ORM 的 schema 变更 + `drizzle-kit push` 直接删除列

**理由**：SQLite 开发环境，数据可重建，无需正式迁移脚本。totalCost 数据不再有用。

### 3. API 返回值变更

**选择**：accounts GET API 返回新增 `holdingsPnl` 字段（Σ 持仓盈亏），移除 `totalCost`

**理由**：前端需要直接拿到持仓盈亏数值用于展示，在 SQL 查询中一并计算效率最高。

## Risks / Trade-offs

- [数据丢失] totalCost 历史数据将丢失 → 可接受，本金数据已无实际用途
- [快照兼容] 历史快照 dataJson 中可能包含 totalCost → 快照是只读历史记录，不影响展示
- [交易副作用] 交易 API 中 deposit/withdraw 可能更新 totalCost → 需检查并移除相关逻辑
