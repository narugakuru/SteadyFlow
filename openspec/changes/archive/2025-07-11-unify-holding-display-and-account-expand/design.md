## Context

上一个 change（unify-position-transaction-ux）已经创建了 `HoldingEditDialog`、`TransactionForm`、`useTriFieldLinked` 等共享组件。本次改动在此基础上进一步统一两个视角的持仓展示和交互。

当前纪律表的持仓展示是简单的 flex 行（名称 + 账户标签 + 市值 + 收益率 + 占比 + 编辑按钮），账户详情页的持仓展示是卡片式（包含完整信息 + 多个操作按钮）。两者格式不一致，需要统一。

账户页当前使用 `AccountList`（表格）→ 点击 → `HoldingsPanel`（子页面）的模式，需要改为 `AccountList`（展开/折叠）模式。

## Goals / Non-Goals

**Goals:**
- 创建统一的 `HoldingRow` 组件，纪律表和账户页共用
- 账户页改为展开/折叠交互，不再跳转子页面
- 纪律表持仓增加交易能力
- 两个视角的操作按钮标准化

**Non-Goals:**
- 不改动后端 API
- 不改动纪律表的资产类别行本身（只改展开后的持仓区域）
- 不改动账户表格的列头和账户行本身的展示

## Decisions

### Decision 1: HoldingRow 组件设计

**选择**: 创建 `src/components/holding-row.tsx`，通过 props 控制展示模式

```tsx
interface HoldingRowProps {
  holding: Holding;
  currency: string;
  totalAssetCny: number;
  rates: Record<string, number>;
  colorMode: "cn" | "us";
  // 显示控制
  showAccountName?: boolean;    // 纪律表模式显示账户名
  accountName?: string;
  // 操作按钮控制
  actions: "compact" | "full";  // compact=交易+编辑, full=交易+编辑+交易记录+删除
  // 回调
  onTrade?: (type: "buy" | "sell", holding: Holding) => void;
  onEdit?: (holding: Holding) => void;
  onDelete?: (holding: Holding) => void;
  accountId?: number;           // 用于交易记录链接
}
```

两行布局：
```
第一行: [名称 小字代码]                    [市值]  [+¥2,000 (+4.00%)]
第二行: [份额 10,000 · 均价 ¥3.50 · 股价 ¥3.85 · 占比 5.2%]  [操作按钮]
```

纪律表模式额外在名称后显示 `[账户名]` 标签。

amount 模式的持仓第二行不显示份额/均价/股价，只显示占比。

### Decision 2: 账户展开/折叠模式

**选择**: 改造 `AccountList` 组件，使用与纪律表相同的展开/折叠模式

展开区域结构：
```
┌─────────────────────────────────────────────────┐
│ 总额 ¥200,000 · 持仓 ¥180,000 · 现金 ¥20,000  │
│                                                 │
│ [✏️ 编辑账户]  [+ 添加持仓]                      │
│                                                 │
│ HoldingRow (full mode)                          │
│ HoldingRow (full mode)                          │
│ ...                                             │
│                                                 │
│ 暂无持仓（如果为空）                              │
└─────────────────────────────────────────────────┘
```

`AccountList` 需要自己 fetch holdings 数据（之前由 HoldingsPanel 负责）。

### Decision 3: 纪律表交易能力

**选择**: 纪律表的 `HoldingRow` 使用 `compact` 模式，交易按钮弹出 `TransactionForm`

纪律表需要额外 fetch accounts 数据来支持 TransactionForm。由于纪律表已经有 `onDataChange` 回调，交易完成后调用即可刷新。

### Decision 4: HoldingsPanel 的处理

**选择**: 保留 `holdings-panel.tsx` 文件但不再被 accounts/page.tsx 使用

HoldingsPanel 的功能被 AccountList 展开模式完全吸收。但考虑到可能有其他地方引用，暂不删除，后续清理。

## Risks / Trade-offs

- [展开模式下空间较窄] 账户表格展开后持仓信息需要在 table 的 colspan 区域内展示 → HoldingRow 设计为紧凑两行布局，信息密度足够
- [纪律表需要额外 fetch accounts] 为了支持 TransactionForm 需要账户列表 → 在 DisciplineTable 组件中按需 fetch，只在用户点击交易按钮时加载
- [AccountList 需要 fetch holdings] 之前由 HoldingsPanel 负责 → AccountList 内部管理 holdings 数据，展开时按 accountId 过滤
