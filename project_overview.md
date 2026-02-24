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
│   ├── page.tsx                    # 主页 Dashboard
│   ├── layout.tsx                  # 根布局
│   ├── snapshots/page.tsx          # 快照历史页
│   └── api/                        # API 路由
│       ├── accounts/               # 账户 CRUD
│       ├── holdings/               # 持仓 CRUD
│       ├── asset-allocation/       # 资产配置
│       ├── asset-classes/          # 资产类别
│       ├── exchange-rates/         # 汇率
│       └── snapshots/              # 快照
├── components/
│   ├── ui/                         # shadcn 基础组件
│   ├── account-list.tsx            # 账户列表
│   ├── holdings-panel.tsx          # 持仓面板
│   ├── discipline-table.tsx        # 投资纪律表
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
    └── exchange-rate.ts            # 汇率获取逻辑
```

## 数据模型

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| accounts | 投资账户 | name, currency(CNY/USD/HKD), totalBalance |
| holdings | 持仓明细 | accountId(FK), name, cost, marketValue, assetClass(枚举) |
| assetClasses | 资产类别配置 | name, targetPct(目标百分比) |
| exchangeRates | 汇率 | currencyPair, rate |
| snapshots | 每日快照 | date, totalAssetCny, dataJson |
| settings | 系统设置 | key, value |

## 已知待改进项

详见 `docs/improvement-proposals.md`，按优先级排列：
- P0：资产类别动态化（当前 enum 硬编码）、批量更新市值
- P1：再平衡建议、成本基础+盈亏计算、可视化图表
- P2：收益率追踪、现金处理优化、快照历史增强、币种动态化
- P3：移动端优化、汇率来源冗余、数据导入导出

## 进展日志

- [2025-02-24] 项目初始化，生成 OpenSpec 方案
- [2025-02-24] V1.0.0 MVP 完成：账户管理、持仓管理、资产配置纪律表、汇率自动获取、每日快照
- [2025-02-24] 新增 UI 改进提案（`docs/improvement-proposals.md`），梳理 12 项改进建议及优先级
- [2025-02-24] 新增 `project_overview.md`，建立多终端协作规范
