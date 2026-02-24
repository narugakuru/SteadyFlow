# InvestManage 项目概览

> 本文件用于多终端协作时同步项目状态，任何终端开始工作前应先阅读此文件。

## 项目简介

个人投资组合管理工具，替代 Excel 实现仓位管理和投资纪律提醒。资金分散在国内外多个平台（A股券商、美股券商、港股券商、银行、支付宝等）。

## 技术栈

- 框架：Next.js 16 (App Router) + React 19 + TypeScript
- 样式：Tailwind CSS 4 + shadcn/ui (Radix UI)
- 数据库：SQLite (better-sqlite3) + Drizzle ORM
- 图标：lucide-react
- 数据存储：`data/invest.db`

## 目录结构

```
src/
├── app/
│   ├── page.tsx                    # 总览页 Dashboard
│   ├── layout.tsx                  # 根布局（含全局导航栏）
│   ├── accounts/page.tsx           # 账户管理页
│   ├── transactions/page.tsx       # 交易记录页
│   ├── snapshots/page.tsx          # 快照历史页
│   ├── batch-update/page.tsx       # 股价更新页
│   └── api/                        # API 路由
│       ├── accounts/               # 账户 CRUD
│       ├── holdings/               # 持仓 CRUD
│       ├── transactions/           # 交易记录 CRUD + 副作用
│       ├── asset-allocation/       # 资产配置
│       ├── asset-classes/          # 资产类别
│       ├── exchange-rates/         # 汇率
│       └── snapshots/              # 快照
├── components/
│   ├── ui/                         # shadcn 基础组件
│   ├── navbar.tsx                  # 全局导航栏
│   ├── account-list.tsx            # 账户列表（含本金/盈亏）
│   ├── holdings-panel.tsx          # 持仓面板（支持双估值模式）
│   ├── portfolio-chart.tsx          # 资产分布双环饼图
│   ├── deviation-chart.tsx          # 偏离度柱状图
│   ├── snapshot-charts.tsx          # 快照走势图表（折线图+面积图）
│   ├── discipline-table.tsx        # 投资纪律表（含进度条+盈亏列）
│   ├── rebalance-panel.tsx         # 再平衡建议面板
│   ├── asset-class-view.tsx        # 资产类别视图
│   └── asset-class-settings.tsx    # 配置设置
├── db/
│   ├── schema.ts                   # 数据模型定义
│   ├── index.ts                    # 数据库连接
│   └── seed.ts                     # 种子数据
└── lib/
    ├── utils.ts                    # 工具函数
    ├── types.ts                    # 类型定义
    ├── hooks.ts                    # 自定义 Hooks
    ├── chart-colors.ts             # 图表颜色常量
    └── exchange-rate.ts            # 汇率获取逻辑
```

## 数据模型

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| accounts | 投资账户 | name, currency(CNY/USD/HKD), totalBalance, totalCost |
| holdings | 持仓明细 | accountId(FK), name, ticker, valuationMode(amount/shares), cost, marketValue, shares, price, assetClass |
| transactions | 交易记录 | accountId(FK), holdingId(FK可选), type(buy/sell/dividend/deposit/withdraw), date, amount, shares, price, fee, affectBalance |
| assetClasses | 资产类别配置 | name, targetPct(目标百分比) |
| exchangeRates | 汇率 | currencyPair, rate |
| snapshots | 每日快照 | date, totalAssetCny, dataJson |
| settings | 系统设置 | key, value |

## 已知待改进项

详见 `docs/improvement-proposals.md`，按优先级排列：
- P0：资产类别动态化（当前 enum 硬编码）、批量更新市值
- P1：~~再平衡建议~~（已完成）、~~成本基础+盈亏计算~~（已完成）、~~可视化图表~~（已完成）
- P2：收益率追踪、现金处理优化、快照历史增强、币种动态化
- P3：移动端优化、汇率来源冗余、数据导入导出

## 进展日志

- [2025-02-24] 项目初始化，生成 OpenSpec 方案
- [2025-02-24] V1.0.0 MVP 完成：账户管理、持仓管理、资产配置纪律表、汇率自动获取、每日快照
- [2025-02-24] 新增 UI 改进提案（`docs/improvement-proposals.md`），梳理 12 项改进建议及优先级
- [2025-02-24] 新增 `project_overview.md`，建立多终端协作规范
- [2025-07-15] 完成可视化图表（P1 #6）：双环饼图、偏离度柱状图、纪律表进度条、总资产走势折线图、资产占比堆叠面积图；新增 chart-colors.ts、deviation-chart.tsx、snapshot-charts.tsx，改造 portfolio-chart.tsx 和 discipline-table.tsx
- [2025-07-15] 完成再平衡建议（P1 #2）+ 盈亏展示补全（P1 #4）：新增 rebalance-panel.tsx，纪律表增加盈亏列，API 返回 adjustAmount/totalCost/totalPnl/pnlAmount 等字段
- [2025-07-16] 完成交易系统+多页导航重构：新增 transactions 表和交易 API（买入/卖出/股息/现金存取，含副作用逻辑和 affectBalance 开关）；holdings 新增 ticker/valuationMode/shares/price 字段支持双估值模式；accounts 新增 totalCost 字段支持账户盈亏；重构为多页导航（总览/账户/交易/快照/股价更新），新增全局导航栏；总览页精简，账户管理和交易记录独立为新页面
