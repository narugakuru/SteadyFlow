## Context

当前 Dashboard 布局（从上到下）：总资产卡片 → 饼图 → 纪律表 → 账户列表。纪律表展示偏离度和红绿灯状态，但不提供调仓建议。成本基础（cost 字段）在代码层面已实现（schema、API、前端 holdings-panel），但 spec 未覆盖，且纪律表/资产类别视角缺少汇总盈亏。

关键数据流：`/api/asset-allocation` → `AllocationData` → Dashboard 分发给各组件。

## Goals / Non-Goals

**Goals:**
- 在纪律表下方新增再平衡建议组件，展示每个资产类别的调仓金额
- 补全盈亏展示：纪律表增加汇总盈亏列，资产类别视角展示类别级盈亏
- API 层返回再平衡建议数据和类别汇总盈亏

**Non-Goals:**
- 不考虑交易成本、最小交易单位等约束（后续迭代）
- 不做具体标的级别的买卖建议（只到资产类别级别）
- 不修改数据模型（cost 字段已存在）

## Decisions

### 1. 再平衡建议的计算位置：API 端

在 `/api/asset-allocation` 的返回数据中增加 `adjustAmount` 字段，计算公式：

```
adjustAmount = (targetPct / 100) * totalAssetCny - actualValue
```

正值表示需要买入，负值表示需要卖出。

理由：计算逻辑简单，放在 API 端保持前端轻量，且与现有 allocation 计算逻辑在同一处。

### 2. 再平衡建议组件：独立组件 `rebalance-panel.tsx`

放在纪律表下方，作为独立组件。接收 `AllocationItem[]` 和 `totalAssetCny`，只展示需要调整的类别（偏离超过警告阈值的）。

布局：卡片式列表，每行显示：类别名 → 当前偏离 → 建议操作（买入/卖出 ¥X）。

理由：独立组件职责清晰，不侵入现有纪律表代码。

### 3. 盈亏数据：复用现有 cost 字段，API 层汇总

`AllocationItem` 增加 `totalCost` 和 `totalPnl` 字段（CNY），在 API 端按类别汇总。`AllocationHolding` 已有 `returnRate`，增加 `pnlAmount`（盈亏金额 CNY）。

纪律表增加"盈亏"列，显示该类别的汇总盈亏金额和百分比。

### 4. 类型扩展

```typescript
// AllocationItem 新增字段
adjustAmount: number;   // 再平衡建议金额（正=买入，负=卖出）
totalCost: number;      // 类别汇总成本 (CNY)
totalPnl: number;       // 类别汇总盈亏 (CNY)

// AllocationHolding 新增字段
pnlAmount: number;      // 单个持仓盈亏金额 (原始币种)
pnlAmountCny: number;   // 单个持仓盈亏金额 (CNY)
```

## Risks / Trade-offs

- [再平衡建议不考虑交易摩擦] → 明确标注"仅供参考"，后续可加入交易成本参数
- [现金类别的 cost 无意义] → 现金类别不显示盈亏，adjustAmount 正常计算
- [cost 为 0 的持仓] → 盈亏显示为 "--"，不参与汇总百分比计算
