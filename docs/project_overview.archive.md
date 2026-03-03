# InvestManage 项目概览

> 本文件用于多终端协作时同步项目状态，任何终端开始工作前应先阅读此文件。

## 项目简介

个人投资组合管理工具，替代 Excel 实现仓位管理和投资纪律提醒。资金分散在国内外多个平台（A股券商、美股券商、港股券商、银行、支付宝等）。

## 技术栈

- 框架：Next.js 16 (App Router) + React 19 + TypeScript
- 样式：Tailwind CSS 4 + shadcn/ui (Radix UI)
- 数据库：SQLite (better-sqlite3) / PostgreSQL (Neon serverless) + Drizzle ORM（通过 DB_TYPE 环境变量切换）
- 图标：lucide-react
- Markdown 渲染：react-markdown（禁用原始 HTML 直出）
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
│   ├── netvalue/page.tsx            # 净值历史页
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
│       ├── discipline-notes/       # 纪律笔记 CRUD
│       └── netvalue/                # 净值
├── middleware.ts                  # 路由守卫（JWT + 管理员权限）
├── components/
│   ├── ui/                         # shadcn 基础组件（含 loading-spinner）
│   ├── navbar.tsx                  # 全局导航栏
│   ├── session-provider.tsx        # SessionProvider 包装
│   ├── vix-sentiment.tsx           # VIX 情绪阈值参考区域（支持当前值高亮）
│   ├── tradingview-chart.tsx       # TradingView Advanced Chart Widget 嵌入组件
│   ├── account-list.tsx            # 账户列表（含持仓盈亏）
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
│   ├── index.ts                    # 数据库连接（动态选择 SQLite/PostgreSQL）
│   └── seed.ts                     # 种子数据（async，兼容双数据库）
├── lib/
│   ├── auth.ts                     # Auth.js 配置与导出
│   ├── auth-utils.ts               # Session 获取与 401 封装
│   ├── user-seed.ts                # 用户级默认数据初始化
│   ├── utils.ts                    # 工具函数
│   ├── format.ts                   # 数值精度配置与统一格式化/截断函数
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
| holdings           | 持仓明细       | accountId(FK), name, ticker, valuationMode(amount/shares), cost, marketValue, shares, price, assetClass, memo(持仓备注)                                               |
| transactions       | 交易记录       | accountId(FK), holdingId(FK可选), type(buy/sell/dividend/deposit/withdraw), date, amount, shares, price, fee, affectCash(影响现金, 0/1), affectHolding(影响持仓, 0/1) |
| assetClasses       | 资产类别配置   | userId(FK, not null), name, targetPct(目标百分比)                                                                                                                     |
| exchangeRates      | 汇率           | currencyPair, rate                                                                                                                                                    |
| netvalue           | 每日净值       | userId(FK, not null), date, totalAssetCny, dataJson                                                                                                                   |
| disciplineNotes    | 纪律笔记       | userId(FK, not null), title, quote, plan, content, createdAt, updatedAt                                                                                               |
| settings           | 系统设置       | userId(FK, not null), key, value                                                                                                                                      |

## 已知待改进项

详见 `docs/improvement-proposals.md`，按优先级排列：

- P0：资产类别动态化（当前 enum 硬编码）、批量更新市值 （均已完成）
- P1：~~再平衡建议~~（已完成）、~~成本基础+盈亏计算~~（已完成）、~~可视化图表~~（已完成）
- P2：收益率追踪、~~现金处理优化~~（已完成）、净值历史增强、币种动态化
- P3：移动端优化、汇率来源冗余、数据导入导出

## 进展日志

- [2026-02-24] 项目初始化，生成 OpenSpec 方案
- [2026-02-24] V1.0.0 MVP 完成：账户管理、持仓管理、资产配置纪律表、汇率自动获取、每日净值
- [2026-02-24] 新增 UI 改进提案（`docs/improvement-proposals.md`），梳理 12 项改进建议及优先级
- [2026-02-24] 新增 `project_overview.md`，建立多终端协作规范
- [2026-02-24] 完成可视化图表（P1 #6）：双环饼图、偏离度柱状图、纪律表进度条、总资产走势折线图、资产占比堆叠面积图；新增 chart-colors.ts、deviation-chart.tsx、netvalue-charts.tsx，改造 portfolio-chart.tsx 和 discipline-table.tsx
- [2026-02-25] 完成再平衡建议（P1 #2）+ 盈亏展示补全（P1 #4）：新增 rebalance-panel.tsx，纪律表增加盈亏列，API 返回 adjustAmount/totalCost/totalPnl/pnlAmount 等字段
- [2026-02-25] 完成交易系统+多页导航重构：新增 transactions 表和交易 API（买入/卖出/股息/现金存取，含副作用逻辑和 affectBalance 开关）；holdings 新增 ticker/valuationMode/shares/price 字段支持双估值模式；accounts 新增 totalCost 字段支持账户盈亏；重构为多页导航（总览/账户/交易/净值/股价更新），新增全局导航栏；总览页精简，账户管理和交易记录独立为新页面
- [2026-02-25] 新增 Windows 独立打包能力：next.config.ts 启用 standalone 输出，新增 server.js 启动脚本（端口检测+自动开浏览器）、启动.bat 用户入口、scripts/package.js 打包脚本（构建+组装+嵌入 node.exe+zip），业务代码零改动
- [2026-02-25] 统一持仓与交易 UX：新增 useTriFieldLinked hook（三字段联动编辑）和 HoldingEditDialog 共享组件；纪律表编辑弹窗升级为模式感知（区分 amount/shares）；账户详情页持仓编辑支持三字段联动；TransactionForm 提取为独立共享组件并增加快捷交易入口（买入/卖出按钮）；交易表单内可直接新建持仓；账户页和交易页支持 URL 参数预选；页面间增加交叉导航链接
- [2026-02-25] 统一持仓展示与账户展开模式：新增 HoldingRow 共享组件（两行布局：核心信息+详细信息，支持 compact/full 操作模式）；纪律表展开区域升级为 HoldingRow（含交易+编辑按钮）；账户页从跳转子页面改为展开/折叠模式（内嵌持仓列表+编辑账户+添加持仓）；holdings-panel.tsx 不再被引用
- [2026-02-25] 新建持仓/编辑持仓移除本金字段：本金由交易记录自动累积，不再支持手动填写；影响 HoldingEditDialog、HoldingForm（holdings-panel/account-list）、TransactionForm 内联新建持仓、holdings POST API（cost 改为可选默认0）
- [2026-02-25] 重构账户模型：totalBalance 改为 cashBalance（现金余额），账户总价值改为实时计算（cashBalance + holdingsValue）；修复盈亏计算、资产配置总资产计算、净值数据；批量更新页面移除账户总额编辑只保留持仓市值更新；新建账户改为只填初始现金
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
- [2026-02-26] 完成直连表 API 鉴权与 userId 过滤（accounts/asset-classes/netvalue/settings）
- [2026-02-26] 完成间接关联表 API 鉴权与用户隔离（holdings/transactions/asset-allocation/batch-update）
- [2026-02-26] 前端接入 SessionProvider，导航栏显示用户信息与登出
- [2026-02-26] 管理后台完成：admin API + 统计面板 + 用户管理页
- [2026-02-26] 修复数据迁移脚本为直连 SQL，避免 Node 直接加载 TS
- [2026-02-26] 统一交易副作用布尔字段存储为 0/1（SQLite/PG），API 读写做 0/1 ⇄ boolean 转换；不提供迁移（手动清库）
- [2026-02-26] PostgreSQL 启动时执行 `drizzle-pg/drizzle-pg\0000_strange_gateway.sql` 完整建表，删除 PG 历史迁移文件
- [2026-02-26] 配置 Husky + lint-staged + Prettier 代码质量检查，每次commit进行格式检测，push前进行类型检查。
- [2026-02-27] 归档 3 个已完成 changes（market-overview-page、bool-to-int-storage、user-auth-system），delta specs 全部同步到主 specs
- [2026-02-27] 完成移动端响应式适配（P3）：导航栏改为汉堡菜单+Sheet抽屉（新增shadcn Sheet组件）；Dialog移动端底部弹出+可滚动；纪律表和账户列表移动端改为卡片布局；HoldingRow移动端垂直堆叠；所有表单网格移动端降为单列；页面容器响应式padding；表格横向滚动；使用md:断点渐进增强，同一套代码
- [2026-02-27] 全面重命名"快照/snapshot"为"净值/netvalue"：数据库表 snapshots→netvalue（含 SQLite+PG 迁移）、API 路由 /api/snapshots→/api/netvalue、页面路由 /snapshots→/netvalue、组件 snapshot-charts→netvalue-charts、类型 Snapshot→NetvalueRecord、spec 目录 daily-snapshot→daily-netvalue、所有文档同步更新
- [2026-02-27] 重构市场概览页：数据获取层从 Yahoo Finance 裸请求改为 yahoo-finance2 v3；表格改为静态骨架模式（API 失败显示"--"不空白）；新增 TradingView Advanced Chart Widget 图表区域，按市场分 Tab（A股/美股/港股/日股/波动率），Tab 内可切换指数；VIX 情绪参考移至波动率 Tab；新增 tradingview-chart.tsx 组件
- [2026-02-27] 新增全局 LoadingSpinner 加载动画组件（Loader2 + animate-spin，支持 sm/md/lg 尺寸和可选文字），替换 7 个页面的纯文本"加载中..."为统一动画组件（Dashboard、账户、交易、净值、股价更新、管理后台、用户管理）
- [2026-02-27] 归档 3 个已完成 changes（loading-spinner、market-page-revamp、stooq-price-integration），delta specs 已同步到主 specs（其中 loading-spinner 的 market-overview 条目按实现状态跳过）
- [2026-02-27] 修复 SQLite 场景下会话与用户表不一致导致的外键失败：`requireUser` 增加 users 存在性校验（无效会话返回 401），账户创建表单补充错误提示与响应状态校验，避免“保存失败但无提示”
- [2026-02-27] 新增 OpenSpec 变更 `mobile-ui-and-asset-class-consistency` 并完成 apply 前全部 artifacts（proposal/design/specs/tasks）：覆盖移动端弹窗与批量更新 UI 修复、移除冗余返回总览按钮、资产类别“股票基金→股票”统一与默认排序规范
- [2026-02-27] 修复 PostgreSQL 清库后自动迁移失效：启动时新增自愈逻辑，若检测到 `public` 业务表为空但 `drizzle.__drizzle_migrations` 仍有记录，则自动重置迁移记录并重新执行 migrate，确保 `npm run dev` 无需手动干预即可重建表并继续 seed
- [2026-02-27] 新增 OpenSpec 变更 `discipline-notes-and-holding-memo` 并 fast-forward 完成 apply 前全部 artifacts（proposal/design/specs/tasks）：覆盖全局悬浮纪律笔记入口、中心弹窗 Markdown 多笔记、持仓 memo 编辑与悬浮提示需求
- [2026-02-27] 完成 OpenSpec 变更 `discipline-notes-and-holding-memo` 的实现：新增 discipline_notes 表与 holdings.memo（SQLite/PG 双迁移）；新增 `/api/discipline-notes` 与 `/api/discipline-notes/[id]`；新增全局悬浮圆形笔记入口与中心大弹窗（投资笔记/经典句子/交易计划/Markdown 内容区，多便签 CRUD）；持仓编辑支持 memo，持仓行支持桌面 hover 备注与移动端点击查看
- [2026-02-27] 修复 push 前类型检查拦截：为 accounts/transactions API 的 `rows.map` 回调参数补充显式类型（`typeof rows[number]`），消除隐式 any 并恢复 `npx tsc --noEmit` 通过
- [2026-02-27] 完成 OpenSpec 变更 `decimal-precision-config`：新增 `src/lib/format.ts`（PRECISION、formatAmount/formatPercent/formatPrice/formatShares/formatRate、roundForStorage），统一替换前后端分散的 `.toFixed()`/`toLocaleString()` 数值处理；API 写入与计算结果统一按类别截断精度，页面与图表统一显示格式；`npm run typecheck` 通过
- [2026-02-27] 修复 PG 清库后旧登录态导致首页/账户页崩溃：`/` 与 `/accounts` 的资产配置请求增加 `res.ok` 与返回结构校验，401 自动跳转登录页，异常数据进入可重试错误态，避免 `allocation.rates.rates` 空对象解构报错
- [2026-02-28] 补齐 PostgreSQL Drizzle 元数据快照链：新增 `drizzle-pg/meta/0001_snapshot.json`（`prevId` 指向 `0000_snapshot`），修复 `_journal` 与 snapshot 不一致；执行 `npx drizzle-kit check --config=drizzle.config.pg.ts` 校验通过
- [2026-02-28] 新增 Drizzle 操作手册 `docs/drizzle-operations-guide.md`：覆盖 SQLite/PG 在本地开发、测试联调、Vercel 部署下的迁移流程、meta/snapshot 机制说明、常见报错排查与快照链修复步骤
- [2026-02-28] 新增项目根文档 `README.md`：补充项目定位、核心功能与技术栈说明；新增本地 SQLite 开发、Vercel+Neon 部署、Windows 离线打包与自托管 Node.js 部署指南，并链接 OAuth/Drizzle 运维文档
- [2026-02-28] 归档历史完整版 `project_overview.md` 到 `docs/project_overview.archive.md`，当前文件改为简版协作文档
- [2026-02-28] 落地资产类别 `sortOrder` 排序方案：`asset_classes` 新增 `sort_order` 字段（SQLite/PG），API 查询改为显式排序并为新增类别自动分配末尾顺序，迁移脚本补齐历史数据回填（默认类与“股票基金”兼容）
- [2026-02-28] 修复持仓编辑接口 `PUT /api/holdings/[id]`：允许 `memo: null` 清空备注，避免编辑现价/成本价时误触发 400；资产类别改为仅在实际变更时校验，防止旧类别值阻塞其它字段保存
- [2026-02-28] 调整持仓交互：金额模式编辑支持同时修改成本与市值；新建持仓默认估值模式改为“份额模式”（账户页与交易页内联新建保持一致）
- [2026-02-28] 完成 OpenSpec 变更 `mobile-ui-and-asset-class-consistency` 实现：统一 Dialog 移动端高度/滚动与 44x44 关闭热区、重构 `batch-update` 移动端单列布局、移除页面内“返回 Dashboard”按钮，并在 API/前端展示层将“股票基金”归一为“股票”且应用默认顺序（股票/黄金/债券/现金）
- [2026-02-28] 微调弹窗关闭按钮样式：改为 36x36，移除红底红框，仅保留深红 `X` 图标并提高图标占比，兼顾显眼与不遮挡内容
- [2026-02-28] 修复纪律笔记交互瑕疵：移除“内容区域”，交易计划改为 Markdown 单区块（默认预览、点击编辑、失焦自动渲染），经典句子改为弹窗每次打开随机展示且不绑定便签、不可编辑并置于底部且无小标题
- [2026-02-28] 调整持仓行操作区交互：移除“交易记录”按钮，编辑/删除改为与账户操作一致的小图标（笔/垃圾桶），并放大强化“交易”按钮以提升可点击性与识别度
- [2026-02-28] 提升 holding 行 memo 可见性：改用更明显的笔记图标（NotebookText）并增强对比样式（橙色底+边框+阴影），桌面与移动端统一- [2026-02-28] 新增 OpenSpec 变更 `visual-sort-for-asset-classes-and-holdings` 并完成 apply 前全部 artifacts（proposal/design/specs/tasks）：覆盖资产类别与标的可视化排序、持久化排序字段、API 稳定排序输出与历史数据兼容策略
- [2026-02-28] 扩展变更 `visual-sort-for-asset-classes-and-holdings`：新增交易页面规格改造（横向表格列顺序固定为账户/标的/操作类型/股数/股价/金额/手续费/日期，删除按钮统一为小垃圾桶样式）
- [2026-02-28] 进一步细化变更 `visual-sort-for-asset-classes-and-holdings`：持仓排序改为“排序按钮打开弹窗 + 拖拽句柄调整 + 点击保存后一次性写库”，弹窗列表仅展示名称/股票编号/账户归属三项核心信息
- [2026-02-28] 完成变更 `visual-sort-for-asset-classes-and-holdings` apply：账户页与纪律表共用持仓拖拽排序弹窗（按账户保存）、资产配置设置改为“排序按钮 + 弹窗拖拽”交互，并补齐 `holdings.sort_order` 迁移、API 稳定排序及交易页横向表格改造落地
- [2026-02-28] 新增 OpenSpec 变更 `discipline-overview-independent-sort-order` 并完成 apply 前 artifacts：规划纪律总览按“资产类别内”独立排序字段；账户内排序字段由 `sort_order` 重命名为 `account_sort_order`；纪律表排序入口改为状态列后右对齐的小图标
- [2026-02-28] 完成变更 `discipline-overview-independent-sort-order` apply：`holdings.sort_order` 迁移为 `account_sort_order` 并新增 `discipline_sort_order`（SQLite/PG）；`/api/holdings/reorder` 新增 discipline 作用域（按资产类别重排 + 用户/类别完整性校验）；纪律表排序入口改为状态列后右对齐小图标，账户排序与纪律排序彻底解耦
- [2026-02-28] 修复股价更新页排版与精度问题：`/batch-update` 持仓行改为紧凑输入布局（缩短市值/股价输入宽度、消除“股数”字段大空白、补充移动端 decimal 输入提示）；联动计算与 `fetch-prices` 写库统一走 `roundForStorage`（amount/price），避免新增 `1197.6000000000001` 类浮点尾差
- [2026-02-28] 修复纪律表提交拦截问题：重构 `DisciplineTable` 数据加载流程（取数与 state 写入解耦、初次加载增加卸载保护），消除 `react-hooks/set-state-in-effect` 报错并恢复预提交校验通过
- [2026-02-28] 调整股价更新页 shares 三字段布局：移动端改为“市值/股数/股价”垂直三行；桌面端改为靠右单行并排展示，减少扫描跳跃并保持输入区域紧凑
- [2026-02-28] 优化“更新股价”按钮样式与反馈文案（Dashboard/批量更新页统一实色高对比按钮 + 加载中图标态），并微调批量更新页面账户卡片与输入区排版，提升可读性与操作聚焦
- [2026-03-03] 修复股价映射兼容：A股 Twelve Data 代码映射改为优先使用 `xxxxxx.SSE`/`xxxxxx.SZSE` 并保留多候选回退；美股 Stooq 增加 `BRK.B.US -> brk-b.us` 兼容转换，减少“有行情但匹配失败”问题
- [2026-03-03] “更新股价”交互改为结果弹窗：Dashboard 与批量更新页统一展示逐条明细（每个标的一行），成功项显示最新股价及来源，失败/跳过项显示具体原因，便于定位代码格式或 API 配置问题
- [2026-03-03] 股价更新接口新增港股/A股双供应商适配：以 Twelve Data 为主（按 8 条/批、批次间隔 65s 分批抓取），EODHD 为备援；美股/日股保持 Stooq 原逻辑。同步在设置弹窗新增 `Twelve Data API Key` 与 `EODHD API Key` 用户配置项（按用户存储于 settings 键值）
- [2026-03-03] 完成净值自动化改造：Dashboard 移除“记录净值”按钮；账户/持仓/交易/批量改价等写接口统一通过封装自动刷新当日净值；新增 `netvalue.timezone` 用户设置（默认 `Asia/Shanghai`）与 IANA 校验；新增 `POST /api/cron/netvalue` + `vercel.json` 小时级调度，按用户本地时区命中凌晨 3 点自动记录净值
- [2026-03-03] 优化资产偏离图：偏离百分比统一为最多两位小数；压缩移动端图表左侧空白并扩大横向占用（`src/components/deviation-chart.tsx`）
- [2026-03-03] 为兼容 Vercel Hobby 计划，将 `vercel.json` 的净值 cron 调度从每小时改为每天一次；`POST /api/cron/netvalue` 改为每次执行即为所有用户按各自时区 upsert 当日净值（不再依赖“本地凌晨3点”窗口），确保用户不登录时也会自动记录当天净值
- [2026-03-03] 增强 Twelve Data 错误可观测性：更新股价失败明细中透传供应商原始错误（如 “symbol 仅 Pro 计划可用”），避免统一显示“无数据”造成误判，便于用户快速判断是代码格式、权限还是额度问题
