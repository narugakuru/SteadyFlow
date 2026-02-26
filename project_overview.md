# InvestManage 项目概览

> 本文件用于多终端协作时同步项目状态，任何终端开始工作前应先阅读此文件。

## 项目简介

个人投资组合管理工具，替代 Excel 实现仓位管理和投资纪律提醒。资金分散在国内外多个平台（A股券商、美股券商、港股券商、银行、支付宝等）。

## 技术栈

- 框架：Next.js 16 (App Router) + React 19 + TypeScript
- 样式：Tailwind CSS 4 + shadcn/ui (Radix UI)
- 数据库：SQLite (better-sqlite3) / PostgreSQL (Neon serverless) + Drizzle ORM（通过 DB_TYPE 环境变量切换）
- 图标：lucide-react
- 认证：Auth.js v5 (next-auth@beta) + bcrypt
- 数据存储：SQLite 模式 `data/invest.db`，PostgreSQL 模式通过 DATABASE_URL 连接

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
│   ├── market/page.tsx             # 市场概览页（TradingView Widget）
│   ├── login/page.tsx              # 登录页
│   ├── register/page.tsx           # 注册页
│   ├── admin/page.tsx              # 管理后台入口
│   ├── admin/users/page.tsx        # 用户管理页
│   └── api/                        # API 路由
│       ├── auth/                   # Auth.js 路由
│       ├── register/               # 注册 API
│       ├── admin/                  # 管理后台 API
│       ├── accounts/               # 账户 CRUD
│       ├── holdings/               # 持仓 CRUD
│       ├── transactions/           # 交易记录 CRUD + 副作用
│       ├── asset-allocation/       # 资产配置
│       ├── asset-classes/          # 资产类别
│       ├── exchange-rates/         # 汇率
│       ├── market/                 # 市场指数行情（Yahoo Finance）
│       └── snapshots/              # 快照
├── middleware.ts                  # 路由守卫（JWT + 管理员权限）
├── components/
│   ├── ui/                         # shadcn 基础组件
│   ├── navbar.tsx                  # 全局导航栏
│   ├── session-provider.tsx        # SessionProvider 包装
│   ├── vix-sentiment.tsx           # VIX 情绪阈值参考区域（支持当前值高亮）
│   ├── account-list.tsx            # 账户列表（含持仓盈亏）
│   ├── holdings-panel.tsx          # 持仓面板（已废弃，不再被引用）
│   ├── holding-edit-dialog.tsx     # 持仓编辑弹窗（三字段联动，共享组件）
│   ├── holding-row.tsx             # 持仓行组件（两行布局，纪律表/账户页共用）
│   ├── transaction-form.tsx        # 交易表单（共享组件，支持预填+内联新建持仓）
│   ├── portfolio-chart.tsx          # 资产分布双环饼图
│   ├── deviation-chart.tsx          # 偏离度柱状图
│   ├── snapshot-charts.tsx          # 快照走势图表（折线图+面积图）
│   ├── discipline-table.tsx        # 投资纪律表（含进度条+盈亏列）
│   ├── rebalance-panel.tsx         # 再平衡建议面板
│   ├── asset-class-view.tsx        # 资产类别视图
│   └── asset-class-settings.tsx    # 配置设置
├── db/
│   ├── schema.ts                   # 统一 schema 导出入口（根据 DB_TYPE 切换）
│   ├── schema-sqlite.ts            # SQLite 方言 schema 定义
│   ├── schema-pg.ts                # PostgreSQL 方言 schema 定义
│   ├── index.ts                    # 数据库连接（动态选择 SQLite/PostgreSQL）
│   └── seed.ts                     # 种子数据（async，兼容双数据库）
├── lib/
│   ├── auth.ts                     # Auth.js 配置与导出
│   ├── auth-utils.ts               # Session 获取与 401 封装
│   ├── user-seed.ts                # 用户级默认数据初始化
│   ├── utils.ts                    # 工具函数
│   ├── types.ts                    # 类型定义
│   ├── hooks.ts                    # 自定义 Hooks
│   ├── chart-colors.ts             # 图表颜色常量
│   ├── exchange-rate.ts            # 汇率获取逻辑
│   └── market-data.ts              # 市场指数数据获取（Yahoo Finance API）
└── types/
    └── next-auth.d.ts              # Auth.js 类型扩展
```

## 数据模型

| 表名               | 用途           | 关键字段                                                                                                                                                              |
| ------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| users              | 用户           | email(unique), password, role(admin/user), plan(free/pro), createdAt                                                                                                  |
| authAccounts       | OAuth 账号关联 | userId(FK), provider, providerAccountId, accessToken                                                                                                                  |
| sessions           | 会话           | sessionToken, userId(FK), expires                                                                                                                                     |
| verificationTokens | 验证令牌       | identifier, token, expires                                                                                                                                            |
| accounts           | 投资账户       | userId(FK, not null), name, currency(CNY/USD/HKD), cashBalance(现金余额)                                                                                              |
| holdings           | 持仓明细       | accountId(FK), name, ticker, valuationMode(amount/shares), cost, marketValue, shares, price, assetClass                                                               |
| transactions       | 交易记录       | accountId(FK), holdingId(FK可选), type(buy/sell/dividend/deposit/withdraw), date, amount, shares, price, fee, affectCash(影响现金, 0/1), affectHolding(影响持仓, 0/1) |
| assetClasses       | 资产类别配置   | userId(FK, not null), name, targetPct(目标百分比)                                                                                                                     |
| exchangeRates      | 汇率           | currencyPair, rate                                                                                                                                                    |
| snapshots          | 每日快照       | userId(FK, not null), date, totalAssetCny, dataJson                                                                                                                   |
| settings           | 系统设置       | userId(FK, not null), key, value                                                                                                                                      |

## 已知待改进项

详见 `docs/improvement-proposals.md`，按优先级排列：

- P0：资产类别动态化（当前 enum 硬编码）、批量更新市值 （均已完成）
- P1：~~再平衡建议~~（已完成）、~~成本基础+盈亏计算~~（已完成）、~~可视化图表~~（已完成）
- P2：收益率追踪、~~现金处理优化~~（已完成）、快照历史增强、币种动态化
- P3：移动端优化、汇率来源冗余、数据导入导出

## 进展日志

- [2026-02-24] 项目初始化，生成 OpenSpec 方案
- [2026-02-24] V1.0.0 MVP 完成：账户管理、持仓管理、资产配置纪律表、汇率自动获取、每日快照
- [2026-02-24] 新增 UI 改进提案（`docs/improvement-proposals.md`），梳理 12 项改进建议及优先级
- [2026-02-24] 新增 `project_overview.md`，建立多终端协作规范
- [2026-02-24] 完成可视化图表（P1 #6）：双环饼图、偏离度柱状图、纪律表进度条、总资产走势折线图、资产占比堆叠面积图；新增 chart-colors.ts、deviation-chart.tsx、snapshot-charts.tsx，改造 portfolio-chart.tsx 和 discipline-table.tsx
- [2026-02-25] 完成再平衡建议（P1 #2）+ 盈亏展示补全（P1 #4）：新增 rebalance-panel.tsx，纪律表增加盈亏列，API 返回 adjustAmount/totalCost/totalPnl/pnlAmount 等字段
- [2026-02-25] 完成交易系统+多页导航重构：新增 transactions 表和交易 API（买入/卖出/股息/现金存取，含副作用逻辑和 affectBalance 开关）；holdings 新增 ticker/valuationMode/shares/price 字段支持双估值模式；accounts 新增 totalCost 字段支持账户盈亏；重构为多页导航（总览/账户/交易/快照/股价更新），新增全局导航栏；总览页精简，账户管理和交易记录独立为新页面
- [2026-02-25] 新增 Windows 独立打包能力：next.config.ts 启用 standalone 输出，新增 server.js 启动脚本（端口检测+自动开浏览器）、启动.bat 用户入口、scripts/package.js 打包脚本（构建+组装+嵌入 node.exe+zip），业务代码零改动
- [2026-02-25] 统一持仓与交易 UX：新增 useTriFieldLinked hook（三字段联动编辑）和 HoldingEditDialog 共享组件；纪律表编辑弹窗升级为模式感知（区分 amount/shares）；账户详情页持仓编辑支持三字段联动；TransactionForm 提取为独立共享组件并增加快捷交易入口（买入/卖出按钮）；交易表单内可直接新建持仓；账户页和交易页支持 URL 参数预选；页面间增加交叉导航链接
- [2026-02-25] 统一持仓展示与账户展开模式：新增 HoldingRow 共享组件（两行布局：核心信息+详细信息，支持 compact/full 操作模式）；纪律表展开区域升级为 HoldingRow（含交易+编辑按钮）；账户页从跳转子页面改为展开/折叠模式（内嵌持仓列表+编辑账户+添加持仓）；holdings-panel.tsx 不再被引用
- [2026-02-25] 新建持仓/编辑持仓移除本金字段：本金由交易记录自动累积，不再支持手动填写；影响 HoldingEditDialog、HoldingForm（holdings-panel/account-list）、TransactionForm 内联新建持仓、holdings POST API（cost 改为可选默认0）
- [2026-02-25] 重构账户模型：totalBalance 改为 cashBalance（现金余额），账户总价值改为实时计算（cashBalance + holdingsValue）；修复盈亏计算、资产配置总资产计算、快照数据；批量更新页面移除账户总额编辑只保留持仓市值更新；新建账户改为只填初始现金
- [2026-02-25] 交易副作用拆分：affectBalance 单开关拆为 affectCash（影响账户现金）+ affectHolding（影响持仓数据）两个独立开关；支持录入已有持仓（只更新持仓不扣现金）；交易列表显示副作用状态标签；API 保持向后兼容
- [2026-02-26] 新增市场概览页（/market）：通过 Yahoo Finance API 获取全球主要指数行情（美股S&P500/纳斯达克100/道琼斯、A股沪深300/上证/创业板/中证500、港股恒生/恒生科技、日股日经225/东证指数、VIX）；表格展示指数名称/最新价/涨跌/涨跌幅/更新时间，每行附 TradingView 跳转链接；VIX 区域含大字当前值 + 5级情绪阈值参考（自动高亮当前级别）；导航栏新增"市场"项
- [2026-02-26] 双数据库支持：新增 PostgreSQL（Neon serverless）支持，通过 DB_TYPE 环境变量切换 SQLite/PostgreSQL；schema 拆分为 schema-sqlite.ts 和 schema-pg.ts，schema.ts 统一导出；db/index.ts 动态选择驱动；drizzle.config.ts 支持双方言配置；所有 API 路由改为标准异步 Drizzle API（移除 .all()/.get()/.run()）；seed.ts 改为 async；新增 drizzle-pg/ 迁移目录
- [2026-02-26] 删除账户本金（totalCost）字段，盈亏改为持仓盈亏：accounts 表移除 totalCost 列（SQLite+PG 双 schema 同步）；账户列表删除本金列，添加/编辑账户表单删除本金输入项；账户盈亏改为持仓盈亏（Σ 持仓 marketValue-cost）；纪律表盈亏列标题改为"持仓盈亏"；交易副作用移除 totalCost 更新逻辑
- [2026-02-26] 修复 shares 模式首次买入/卖出市值为 0 的 bug：交易 API 的 buy/sell 副作用中，shares 模式现在用交易成交价（txPrice）更新 holding.price 并重新计算 marketValue，修正了首次买入时 holding.price 为 0 导致市值不更新的问题
- [2026-02-26] UI 修复三项：饼图内环 Tooltip 从显示金额改为显示百分比；账户列表交易/编辑后展开状态不再收缩（修复父组件 refresh 导致 unmount）；股价更新页 shares 模式持仓增加市值/股数/股价三字段联动编辑，API 支持同时更新 price
- [2026-02-26] 持仓编辑增加股票代码字段：HoldingEditDialog 新增 ticker 输入框（与名称并排），支持后期补充股票代码
- [2026-02-26] ↑↑↑以上个人使用版本开发完毕，↓↓↓接下来开始大幅重构，改为vercel+neon-pg的面向多用户的平台工具
- [2026-02-26] 新增 Auth.js 相关依赖（next-auth@beta、@auth/drizzle-adapter、bcrypt）与 GitHub OAuth 配置文档
- [2026-02-26] 完成 Auth 数据表与业务表 userId 字段 schema 调整，并补充 SQLite/PG 迁移文件
- [2026-02-26] 新增 Auth.js 配置与 NextAuth API 路由（Credentials + GitHub OAuth，JWT 写入 userId/role/plan）
- [2026-02-26] 新增登录/注册页面与注册 API（邮箱密码注册、记住我、GitHub OAuth 按钮）
- [2026-02-26] 新增全局 middleware 路由守卫（登录校验 + 管理员权限）
- [2026-02-26] 新增数据迁移脚本与 userId NOT NULL 迁移（默认 admin 归属历史数据）
- [2026-02-26] Seed 改造：全局仅保留汇率，新增用户级 seed 并接入注册流程
- [2026-02-26] 完成直连表 API 鉴权与 userId 过滤（accounts/asset-classes/snapshots/settings）
- [2026-02-26] 完成间接关联表 API 鉴权与用户隔离（holdings/transactions/asset-allocation/batch-update）
- [2026-02-26] 前端接入 SessionProvider，导航栏显示用户信息与登出
- [2026-02-26] 管理后台完成：admin API + 统计面板 + 用户管理页
- [2026-02-26] 修复数据迁移脚本为直连 SQL，避免 Node 直接加载 TS
- [2026-02-26] 统一交易副作用布尔字段存储为 0/1（SQLite/PG），API 读写做 0/1 ⇄ boolean 转换；不提供迁移（手动清库）
- [2026-02-26] PostgreSQL 启动时执行 `drizzle-pg/drizzle-pg\0000_strange_gateway.sql` 完整建表，删除 PG 历史迁移文件
- [2026-02-26] 配置 Husky + lint-staged + Prettier 代码质量检查，每次commit进行格式检测，push前进行类型检查。
- [2026-02-27] 归档 3 个已完成 changes（market-overview-page、bool-to-int-storage、user-auth-system），delta specs 全部同步到主 specs
- [2026-02-27] 完成移动端响应式适配（P3）：导航栏改为汉堡菜单+Sheet抽屉（新增shadcn Sheet组件）；Dialog移动端底部弹出+可滚动；纪律表和账户列表移动端改为卡片布局；HoldingRow移动端垂直堆叠；所有表单网格移动端降为单列；页面容器响应式padding；表格横向滚动；使用md:断点渐进增强，同一套代码
