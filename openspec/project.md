## 技术栈

- 框架：Next.js 16 (App Router) + React 19 + TypeScript
- 样式：Tailwind CSS 4 + shadcn/ui (Radix UI)，主按钮默认配色由共享 `Button` 组件与 `src/app/globals.css` 的 CSS 变量统一维护，基准为 Dashboard“更新股价”按钮
- 图表：Recharts（净值图与市场页 VIX 图）
- 数据库：SQLite (better-sqlite3) / PostgreSQL (Neon serverless) + Drizzle ORM（通过 DB_TYPE 环境变量切换）
- 图标：lucide-react
- Markdown 渲染：react-markdown（禁用原始 HTML 直出）
- 认证：Auth.js v5 (next-auth@beta) + bcrypt
- 数据存储：SQLite 模式 `data/invest.db`，PostgreSQL 模式通过 DATABASE_URL 连接
- 外部市场数据：Stooq、腾讯简易行情、CBOE VIX 历史 CSV

## 目录结构

```
src/
├── app/
│   ├── page.tsx                    # 总览页 Dashboard
│   ├── layout.tsx                  # 根布局（含全局导航栏）
│   ├── accounts/page.tsx           # 账户管理页
│   ├── transactions/page.tsx       # 交易记录页
│   ├── netvalue/page.tsx           # 净值历史页（图表 range+grain + 列表分页）
│   ├── batch-update/page.tsx       # 股价更新页
│   ├── market/page.tsx             # 市场概览页（VIX 图 + ATH 回撤 + 全球指数表）
│   ├── login/page.tsx              # 登录页
│   ├── register/page.tsx           # 注册页
│   ├── admin/page.tsx              # 管理后台入口
│   ├── admin/users/page.tsx        # 用户管理页
│   └── api/                        # API 路由
│       ├── auth/                   # Auth.js 路由
│       ├── register/               # 注册 API
│       ├── admin/                  # 管理后台 API
│       ├── accounts/               # 账户 CRUD + 默认排序重排
│       ├── holdings/               # 持仓 CRUD
│       ├── transactions/           # 交易记录 CRUD + 副作用
│       ├── asset-allocation/       # 资产配置
│       ├── asset-classes/          # 资产类别
│       ├── exchange-rates/         # 汇率
│       ├── market/                 # 市场聚合行情（Stooq/Tencent/CBOE）
│       ├── discipline-notes/       # 纪律笔记 CRUD
│       ├── export/portfolio/       # 投资组合 JSON 导出（detail=full|decision）
│       ├── netvalue/               # 净值（POST 当日 upsert；GET 兼容旧全量读取；子路由含 list/chart）
│       └── cron/netvalue/          # 每日“先价后值”定时任务入口（CRON_SECRET 鉴权）
├── proxy.ts                       # 路由守卫（JWT + 管理员权限）
├── components/
│   ├── ui/                         # shadcn 基础组件（含 loading-spinner；主按钮统一入口为 ui/button.tsx）
│   ├── navbar.tsx                  # 全局导航栏
│   ├── page-container.tsx          # 共享页面/导航内容容器（max-w-5xl）
│   ├── session-provider.tsx        # SessionProvider 包装
│   ├── vix-chart-card.tsx          # 市场页顶部 VIX 图表卡片
│   ├── vix-sentiment.tsx           # VIX 单态区间说明组件
│   ├── tradingview-chart.tsx       # TradingView Advanced Chart Widget 嵌入组件（保留，市场页未引用）
│   ├── account-list.tsx            # 账户列表（含账户默认排序与表头三态排序）
│   ├── account-sort-dialog.tsx     # 账户默认排序弹窗（拖拽重排）
│   ├── holdings-panel.tsx          # 持仓面板（已废弃，不再被引用）
│   ├── holding-edit-dialog.tsx     # 持仓编辑弹窗（三字段联动，共享组件）
│   ├── holding-row.tsx             # 持仓行组件（两行布局，纪律表/账户页共用）
│   ├── transaction-form.tsx        # 交易表单（共享组件，支持预填+内联新建持仓）
│   ├── portfolio-chart.tsx          # 资产分布双环饼图
│   ├── deviation-chart.tsx          # 偏离度柱状图
│   ├── netvalue-charts.tsx          # 净值走势图表（折线图+面积图）
│   ├── discipline-table.tsx        # 投资纪律表（含进度条+盈亏列）
│   ├── discipline-notes-fab.tsx    # 全局悬浮纪律笔记入口 + 笔记弹窗
│   ├── rebalance-panel.tsx         # 再平衡建议面板
│   ├── asset-class-view.tsx        # 资产类别视图
│   └── asset-class-settings.tsx    # 配置设置
├── db/
│   ├── schema.ts                   # 统一 schema 导出入口（根据 DB_TYPE 切换）
│   ├── schema-sqlite.ts            # SQLite 方言 schema 定义
│   ├── schema-pg.ts                # PostgreSQL 方言 schema 定义
│   ├── index.ts                    # 数据库连接（动态选择 SQLite/PostgreSQL，启动自动 migrate + seed + runtime maintenance）
│   ├── runtime-maintenance.ts      # 运行时维护任务（历史 netvalue.dataJson 瘦身回填等）
│   └── seed.ts                     # 种子数据（async，兼容双数据库）
├── lib/
│   ├── auth/                       # 认证相关
│   │   ├── auth.ts                 # Auth.js 配置与导出
│   │   └── auth-utils.ts           # Session 获取与 401 封装
│   ├── services/                   # 业务服务层
│   │   ├── user-seed.ts            # 用户级默认数据初始化
│   │   ├── settings-service.ts     # settings 读写与公开设置提取
│   │   ├── quote-sync-metadata-service.ts # quote_sync.* 元数据读写与标准化
│   │   ├── holding-price-sync-service.ts # 持仓报价同步（manual/silent-client/cron）
│   │   ├── portfolio-snapshot-service.ts # 资产配置与导出快照聚合
│   │   ├── netvalue-service.ts     # 净值计算与写入服务（时区 + upsert；新快照仅写 allocation + rates）
│   │   ├── netvalue-history-service.ts # 净值历史读取/聚合/回填服务（分页、chart range+grain、历史瘦身）
│   │   ├── netvalue-history-helpers.ts # 净值历史分页、聚合与 dataJson 标准化辅助函数
│   │   └── mutation-with-netvalue.ts # 写操作后自动触发净值刷新封装
│   ├── utils/                      # 通用工具、类型与 hooks
│   │   ├── utils.ts                # 工具函数
│   │   ├── format.ts               # 数值精度配置与统一格式化/截断函数
│   │   ├── types.ts                # 类型定义
│   │   ├── quote-sync.ts           # 报价同步状态/阈值判断
│   │   ├── hooks.ts                # 自定义 Hooks
│   │   ├── asset-class.ts          # 资产类别标准化与默认顺序
│   │   └── timezone.ts             # IANA 时区校验与本地日期/时间计算
│   ├── cache/                      # 客户端缓存层（Query/持久化/广播）
│   ├── visualization/              # 可视化相关（图表、配色）
│   │   ├── chart-colors.ts         # 图表颜色常量
│   │   └── asset-class-colors.ts   # 资产类别标签配色
│   ├── data-source/                # 数据源适配层（行情/汇率）
│   │   ├── exchange-rate.ts        # 汇率获取逻辑
│   │   ├── market-config.ts        # 市场页指数 / VIX / ATH 配置
│   │   ├── market-helpers.ts       # 市场页快照与 ATH 计算辅助函数
│   │   ├── market-data.ts          # 市场聚合数据（指数快照 + VIX + ATH）
│   │   ├── stooq.ts                # Stooq 行情与历史数据
│   │   ├── cboe-vix.ts             # CBOE VIX 历史 CSV 适配
│   │   ├── yahoo.ts                # Yahoo Finance 行情
│   │   ├── tencent-quote.ts        # 腾讯简易行情（持仓 + 市场指数）
│   │   ├── twelve-data.ts          # Twelve Data 行情
│   │   └── eodhd.ts                # EODHD 行情
└── types/
    └── next-auth.d.ts              # Auth.js 类型扩展
```

## 数据模型

| 表名               | 用途           | 关键字段                                                                                                                                                                                                     |
| ------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| users              | 用户           | email(unique), password, role(admin/user), plan(free/pro), createdAt                                                                                                                                         |
| authAccounts       | OAuth 账号关联 | userId(FK), provider, providerAccountId, accessToken                                                                                                                                                         |
| sessions           | 会话           | sessionToken, userId(FK), expires                                                                                                                                                                            |
| verificationTokens | 验证令牌       | identifier, token, expires                                                                                                                                                                                   |
| accounts           | 投资账户       | userId(FK, not null), name, currency(CNY/USD/HKD), cashBalance(现金余额), realizedPnl(累计了结盈亏，账户原币种), sortOrder(账户默认排序)                                                                     |
| holdings           | 持仓明细       | accountId(FK), name, ticker, valuationMode(amount/shares), cost, marketValue, shares, price, assetClass, memo(持仓备注)                                                                                      |
| transactions       | 交易记录       | accountId(FK), holdingId(FK可选), type(buy/sell/dividend/deposit/withdraw), date, amount, realizedPnl(单笔了结盈亏，账户原币种), shares, price, fee, affectCash(影响现金, 0/1), affectHolding(影响持仓, 0/1) |
| assetClasses       | 资产类别配置   | userId(FK, not null), name, targetPct(目标百分比)                                                                                                                                                            |
| exchangeRates      | 汇率           | currencyPair, rate                                                                                                                                                                                           |
| netvalue           | 每日净值       | userId(FK, not null), date, totalAssetCny, dataJson（新结构仅保留 `allocation + rates`；旧结构允许带 `accounts`，由读取兼容层与回填任务清理）                                                                |
| disciplineNotes    | 纪律笔记       | userId(FK, not null), title, quote, plan, content, createdAt, updatedAt                                                                                                                                      |
| settings           | 系统设置       | userId(FK, not null), key, value（含 `netvalue.timezone`、`quote_api.twelvedata_key`、`quote_api.eodhd_key`、`quote_sync.*`、`cron.netvalue.cursor` 等键）                                                   |
