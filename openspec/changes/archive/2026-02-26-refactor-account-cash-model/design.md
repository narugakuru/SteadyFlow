## Context

当前 `accounts.totalBalance` 字段在交易系统中被当作现金余额操作（买入扣减、卖出增加），但在 UI 和资产配置计算中被当作账户总额使用。这导致买入后现金计算为负数（被 `Math.max(0)` 截断）、账户盈亏不反映持仓涨跌、总资产计算遗漏持仓市值等一系列问题。

涉及的核心文件：
- `src/db/schema.ts` — 数据模型定义
- `src/app/api/accounts/route.ts` — 账户 CRUD
- `src/app/api/transactions/route.ts` — 交易副作用
- `src/app/api/asset-allocation/route.ts` — 资产配置计算
- `src/app/api/holdings/route.ts` — 持仓 CRUD
- `src/app/batch-update/page.tsx` — 批量更新页面
- `src/app/api/snapshots/route.ts` — 快照创建
- `src/components/account-list.tsx` — 账户列表 UI
- `src/lib/types.ts` — TypeScript 类型定义

## Goals / Non-Goals

**Goals:**
- 将 `totalBalance` 明确重命名为 `cashBalance`，语义为"账户现金余额"
- 账户总价值 = `cashBalance + Σ(holdings.marketValue)` 实时计算，不存储
- 股价变动只需更新持仓，账户总价值和盈亏自动跟随变化
- 迁移现有数据：`cashBalance = 原 totalBalance`（因为交易系统已经把它当现金用了）
- 批量更新页面只更新持仓股价/市值，不再编辑账户总额

**Non-Goals:**
- 不改变持仓的数据模型（cost/marketValue/shares/price 保持不变）
- 不改变交易类型和交易流程
- 不引入新的数据库表
- 不做历史快照数据的回溯修正（已有快照保留原样）

## Decisions

### Decision 1: 字段重命名策略 — SQLite ALTER TABLE + Drizzle schema 同步

直接用 SQLite `ALTER TABLE RENAME COLUMN` 将 `total_balance` 改为 `cash_balance`。

**理由**：SQLite 3.25+ 支持 `RENAME COLUMN`，操作原子性好，数据零丢失。比新建列+迁移+删旧列更简洁。

**替代方案**：保留 `total_balance` 列名只改 Drizzle 映射 — 拒绝，因为列名和语义不一致会造成后续维护困惑。

### Decision 2: 数据迁移 — totalBalance 值直接作为 cashBalance

现有 `totalBalance` 的值在交易系统中已经被当作现金操作（买入扣减、卖出增加），所以它的当前值实际上就是现金余额。直接重命名即可，无需额外计算。

**理由**：分析交易副作用代码，买入时 `totalBalance -= amount`，卖出时 `totalBalance += amount`，存入时 `totalBalance += amount`。这些操作的语义就是在操作现金。

**风险**：如果用户曾手动编辑过 `totalBalance`（通过编辑账户表单或批量更新），值可能不准确。但这是已有数据质量问题，不是迁移引入的。

### Decision 3: 账户总价值 — 纯计算值，不存储

`accountValue = cashBalance + holdingsValue` 在 API 层实时计算，不存入数据库。

**理由**：
- 持仓市值随股价变动，存储的总价值会立即过期
- 计算成本极低（一次 SQL JOIN + SUM）
- 避免数据不一致

### Decision 4: 快照处理 — 新快照用新公式，旧快照保留

新创建的快照使用正确的 `cashBalance + holdingsValue` 计算总资产。已有快照数据不做回溯修正。

**理由**：旧快照的 `totalAssetCny` 可能本身就不准确（基于错误的 totalBalance），回溯修正需要重建历史状态，复杂度高且价值有限。用户如需清理，可手动删除旧快照。

### Decision 5: 批量更新简化 — 移除账户总额编辑

批量更新页面只保留持仓的市值/股价编辑，移除账户总额输入框。

**理由**：新模型下账户总价值是计算值，不可直接编辑。现金余额通过交易（存入/取出）修改更合理。批量更新的核心场景是"更新股价"，不需要改现金。

## Risks / Trade-offs

- **[数据迁移风险]** 如果用户曾手动把 totalBalance 设为"总资产"而非"现金"，迁移后 cashBalance 值会偏大 → 迁移后提示用户检查各账户现金余额是否合理
- **[快照不连续]** 新旧快照的 totalAssetCny 计算口径不同，走势图可能出现跳变 → 用户可选择删除旧快照重新开始
- **[批量更新功能缩减]** 移除账户总额编辑可能影响部分用户习惯 → 现金调整通过交易页面的存入/取出操作完成，更规范

## Migration Plan

1. 执行 SQL：`ALTER TABLE accounts RENAME COLUMN total_balance TO cash_balance;`
2. 更新 Drizzle schema：`totalBalance` → `cashBalance`
3. 更新所有引用 `totalBalance` 的代码（API、组件、类型）
4. 更新 API 返回值：增加计算字段 `accountValue = cashBalance + holdingsValue`
5. 更新前端展示：市值列显示 `accountValue`，现金列显示 `cashBalance`
6. 简化批量更新页面
7. 更新快照创建逻辑

回滚策略：`ALTER TABLE accounts RENAME COLUMN cash_balance TO total_balance;` + git revert
