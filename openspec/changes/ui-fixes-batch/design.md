## Context

当前存在三个独立的 UI 瑕疵，均为前端组件层面的修复，不涉及数据模型变更：

1. `portfolio-chart.tsx` 的 Tooltip formatter 对内环（目标配置）和外环（实际配置）使用了相同的金额格式化逻辑，但内环 dataKey 是百分比值（如 40），显示为 `¥40` 而非 `40%`
2. `account-list.tsx` 的 `handleDataChange` 调用 `onRefresh()` 触发父组件重新获取 accounts 数据，导致组件重新渲染时 expanded state 被重置（因为 accounts 引用变化触发了子组件重建）
3. `batch-update/page.tsx` 对所有持仓统一只显示市值编辑框，shares 模式持仓缺少股数和股价信息，且无法通过编辑股价来反算市值

## Goals / Non-Goals

**Goals:**
- 修复饼图内环 Tooltip 显示百分比而非金额
- 交易/编辑操作后保持账户展开状态
- 股价更新页 shares 模式持仓展示市值、股数、股价，支持市值↔股价联动编辑

**Non-Goals:**
- 不改变饼图的布局或颜色方案
- 不改变账户列表的整体交互模式
- 不为 amount 模式持仓增加额外字段

## Decisions

### 1. 饼图 Tooltip 区分内外环

Recharts 的 Tooltip formatter 接收 `(value, name, props)` 参数，`props.payload` 包含原始数据对象。在数据中添加 `ring: "inner" | "outer"` 标记，formatter 根据 ring 类型选择格式化方式：inner 显示 `{value}%`，outer 显示 `¥{value.toLocaleString()}`。

备选方案：用两个独立 Tooltip 分别挂载到内外环 Pie 上——Recharts 不支持单 PieChart 内多个独立 Tooltip，排除。

### 2. 账户展开状态保持

问题根因：`handleDataChange` 调用 `onRefresh()` → 父组件 re-fetch accounts → AccountList 收到新的 accounts prop → 但 expanded state 是 `useState` 管理的，理论上不会丢失。实际问题可能是 `onRefresh` 导致父组件整体 re-render，AccountList 被 unmount/remount。

解决方案：在 `handleDataChange` 中只刷新 holdings 数据（`fetchHoldings()`），不调用 `onRefresh()`。但 onRefresh 需要更新账户数据（如现金余额变化）。因此改为：onRefresh 回调后不重置 expanded state——确保 expanded 是稳定的 state，不受 props 变化影响。如果父组件 unmount/remount 了 AccountList，则需要在父组件层面避免这种情况（如用 key 稳定化）。

实际最简方案：检查父组件（accounts/page.tsx）的 refresh 逻辑，确保 AccountList 不会被 unmount。

### 3. 股价更新页 shares 模式联动编辑

shares 模式持仓行改为三列布局：
- 股数（只读显示）
- 股价（可编辑 Input）
- 市值（可编辑 Input）

联动逻辑：
- 编辑股价 → 市值 = 股数 × 新股价
- 编辑市值 → 股价 = 新市值 / 股数

edits state 扩展为同时记录 `{ marketValue, price }` 对。

API 扩展：`PUT /api/batch-update` 的 holdings payload 增加可选 `price` 字段，后端同时更新 `marketValue` 和 `price`。

## Risks / Trade-offs

- [饼图] Recharts Tooltip 是全局共享的，需要在 formatter 中通过 payload 数据区分内外环，如果 Recharts 版本升级改变了 payload 结构可能需要调整 → 风险低，payload 结构是 Recharts 核心 API
- [展开状态] 如果父组件因其他原因 unmount AccountList（如条件渲染），expanded state 仍会丢失 → 可接受，当前架构下 AccountList 是稳定挂载的
- [批量更新] shares=0 时编辑股价无法计算市值 → 此时只允许直接编辑市值，股价字段禁用
