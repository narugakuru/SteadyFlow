## Context

交易系统当前使用单一 `affectBalance` 开关控制所有副作用。买入交易的副作用包含两部分：1) 更新持仓数据（cost/shares/marketValue）2) 扣减账户现金（cashBalance）。这两部分被绑定在一起，无法独立控制。

用户录入已有持仓的典型场景：账户已有现金 50000 和股票市值 80000，用户先设置 cashBalance=50000，然后想通过买入交易录入持仓。但买入会扣现金，导致 cashBalance 变负。

涉及文件：
- `src/db/schema.ts` — transactions 表定义
- `src/app/api/transactions/route.ts` — 交易创建 + 副作用
- `src/components/transaction-form.tsx` — 交易表单 UI
- `src/app/transactions/page.tsx` — 交易列表页
- `src/lib/types.ts` — Transaction 类型

## Goals / Non-Goals

**Goals:**
- 将 `affectBalance` 拆为 `affectCash`（影响账户现金）和 `affectHolding`（影响持仓数据）两个独立开关
- 交易表单提供两个独立 Switch，默认都开启
- 迁移已有数据：`affect_balance` 的值同时赋给两个新字段
- 保持向后兼容：API 仍接受 `affectBalance` 参数作为两个字段的快捷设置

**Non-Goals:**
- 不改变交易类型（buy/sell/dividend/deposit/withdraw）
- 不改变副作用的具体计算逻辑
- 不增加新的交易类型

## Decisions

### Decision 1: 数据库字段策略 — 新增两列 + 删除旧列

新增 `affect_cash`（INTEGER, NOT NULL, DEFAULT 1）和 `affect_holding`（INTEGER, NOT NULL, DEFAULT 1），迁移数据后删除 `affect_balance`。

SQLite 不支持 DROP COLUMN（3.35.0 之前），但项目使用的 SQLite 版本支持。用 ALTER TABLE 完成。

**替代方案**：保留 `affect_balance` 作为兼容字段 — 拒绝，增加维护负担且语义混乱。

### Decision 2: API 兼容性 — 支持 affectBalance 作为快捷参数

POST API 同时接受：
- `affectCash` + `affectHolding`（新参数，优先）
- `affectBalance`（旧参数，等价于同时设置两个新字段）

如果三个都传，`affectCash`/`affectHolding` 优先。

### Decision 3: 副作用拆分逻辑

```
买入 (buy):
  if affectHolding → 更新 holding (cost, shares, marketValue)
  if affectCash    → cashBalance -= (amount + fee)

卖出 (sell):
  if affectHolding → 更新 holding (cost, shares, marketValue)
  if affectCash    → cashBalance += (amount - fee)

股息 (dividend):
  if affectCash    → cashBalance += (amount - fee)
  (affectHolding 对 dividend 无效，不影响持仓)

存入 (deposit):
  if affectCash    → cashBalance += amount, totalCost += amount
  (affectHolding 对 deposit 无效)

取出 (withdraw):
  if affectCash    → cashBalance -= amount, totalCost -= amount
  (affectHolding 对 withdraw 无效)
```

### Decision 4: UI 展示 — 根据交易类型智能显示开关

- buy/sell：显示两个开关（影响现金 + 影响持仓）
- dividend/deposit/withdraw：只显示"影响现金"开关（持仓开关隐藏，因为这些类型本身不影响持仓）

## Risks / Trade-offs

- **[数据迁移]** 已有交易记录的 `affect_balance=0` 会被迁移为 `affect_cash=0, affect_holding=0`，语义一致 → 低风险
- **[UI 复杂度]** 两个开关比一个复杂，但通过智能隐藏减轻认知负担 → 可接受
