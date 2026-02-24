## Context

当前系统是单页应用，所有功能（总览、账户列表、持仓管理）挤在 Dashboard 页面。持仓的本金和市值只能手动编辑，没有交易记录概念。数据模型中 holdings 表只有 cost/marketValue 两个数值字段，accounts 表只有 totalBalance 一个余额字段。

技术栈：Next.js 16 (App Router) + React 19 + TypeScript + SQLite (better-sqlite3) + Drizzle ORM + shadcn/ui。

## Goals / Non-Goals

**Goals:**
- 引入交易记录系统，支持买入/卖出/股息/现金存取五种交易类型
- 持仓支持双估值模式：amount（手动市值）和 shares（股价×份额）
- 账户支持本金（totalCost）字段，实现账户级盈亏
- 重构为多页导航结构，全局顶部导航栏
- 交易创建时自动修改持仓/账户数据，删除交易不回滚
- 保留手动编辑能力，手动与交易两条路径互不干扰

**Non-Goals:**
- 自动股价 API 接入（本次只做手动/批量手动更新）
- 单笔交易盈亏分析
- 交易编辑功能（只支持创建和删除）
- 移动端适配优化

## Decisions

### 1. 交易副作用模型：创建时直接修改，删除不回滚

**选择**: 交易创建时直接修改 holding/account 的字段值，删除交易只删记录不回滚持仓数据。

**替代方案**: 全量重算模式（每次增删交易都从头重算）。

**理由**: 用户明确表示持仓数据是"既定事实"，交易记录是操作日志用于回顾，不应反向影响持仓。这大幅简化了实现，不需要处理历史交易序列的重算问题。

### 2. 持仓估值模式：amount vs shares

**选择**: 在 holdings 表新增 `valuationMode` 字段（"amount" | "shares"），默认 "amount"。

- amount 模式：marketValue 手动更新，适用于支付宝基金等无份额概念的标的
- shares 模式：marketValue = shares × price 自动计算，适用于股票/ETF

**理由**: 两种标的的市值计算逻辑本质不同，用一个字段区分比强行统一更清晰。UI 表单根据模式显示不同字段。

### 3. 卖出成本回收：平均成本法

**选择**:
- shares 模式：`costReduce = sellShares × (holding.cost / holding.shares)`
- amount 模式：`costReduce = sellAmount × (holding.cost / holding.marketValue)`

**理由**: 平均成本法最简单直观，对个人投资管理足够。

### 4. 数据冗余存储

**选择**: holding 上冗余存储 cost/shares/marketValue，交易创建时直接修改这些字段。不存储 avgCost（展示时用 cost/shares 计算）。

**理由**: 查询快，不用每次聚合交易记录。由于删除交易不回滚，不存在同步一致性问题。

### 5. 页面结构

**选择**:
```
layout.tsx          → 全局导航栏
/                   → 总览（图表、纪律表、再平衡）
/accounts           → 账户 + 持仓管理
/transactions       → 交易记录
/snapshots          → 快照历史（已有）
/batch-update       → 股价更新（已有）
```

**替代方案**: 保持单页 + Tab 切换。

**理由**: 功能越来越多，单页已经拥挤。多页结构职责清晰，URL 可直接分享/收藏。

### 6. affectBalance 开关

**选择**: 交易表单提供 `affectBalance` 开关（默认开启），关闭时交易只记录不影响账户余额。

**理由**: 给首次使用的用户补录历史交易记录用，避免重复计算已经手动设置好的余额。

### 7. 数据库迁移策略

**选择**: 使用 Drizzle 的 push 模式直接同步 schema 变更。新字段给默认值：
- accounts.totalCost 默认 0
- holdings.ticker 默认 null
- holdings.valuationMode 默认 "amount"
- holdings.shares 默认 0
- holdings.price 默认 0

**理由**: 个人工具，SQLite 单文件数据库，push 模式足够。旧持仓默认 amount 模式，行为与之前完全一致。

## Risks / Trade-offs

- [手动编辑与交易记录冲突] → 后操作覆盖前操作，符合用户预期。UI 上不做特殊提示。
- [amount 模式卖出时市值为 0] → 卖出时校验 marketValue > 0，否则拒绝操作。
- [shares 模式卖出超过持有份额] → 卖出时校验 sellShares ≤ holding.shares。
- [旧数据无 totalCost] → 默认 0，用户可手动补填或通过 deposit 交易设置。

## Migration Plan

1. 更新 db/schema.ts，新增 transactions 表，accounts/holdings 表加字段
2. 运行 drizzle push 同步数据库
3. 旧持仓自动获得 valuationMode="amount"、shares=0、price=0
4. 旧账户自动获得 totalCost=0
5. 无需数据迁移脚本，用户按需手动补填
