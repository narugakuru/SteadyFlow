# InvestManage 项目概览（简版）

> 本文件用于多终端协作快速同步状态。历史完整版本见 `docs/project_overview.archive.md`。

## 项目定位

个人投资组合管理 Web 工具，替代 Excel 管理多平台资产，覆盖账户、持仓、交易、净值、纪律提醒与市场概览。

## 当前状态（2026-02-28）

- 阶段：多用户平台化版本已落地（Auth.js + 用户隔离 + 管理后台）。
- 运行模式：`DB_TYPE=sqlite`（本地）或 `DB_TYPE=postgres`（Vercel + Neon）。
- 核心页面已稳定：总览、账户、交易、净值、股价更新、市场、登录/注册、管理后台。
- OpenSpec 流程在用：变更通过 `openspec/changes` 管理，归档后同步到 `openspec/specs`。

## 技术栈（摘要）

- 前端：Next.js 16 (App Router)、React 19、TypeScript、Tailwind CSS 4、shadcn/ui
- 后端：Next.js Route Handlers、Drizzle ORM
- 数据库：SQLite (`better-sqlite3`) / PostgreSQL (Neon serverless)
- 认证：Auth.js v5 (`next-auth@beta`) + Credentials + GitHub OAuth

## 详细的目录结构，数据模型在openspec\project.md文件里

## 目录结构（摘要）

```text
src/
  app/          # 页面与 API 路由
  components/   # UI 与业务组件
  db/           # schema、连接、迁移启动与 seed
  lib/          # auth、格式化、工具与数据服务
docs/           # 运维与说明文档
openspec/       # 需求规格与变更流程
```

## 数据模型（核心表）

- 认证与用户：`users`、`authAccounts`、`sessions`、`verificationTokens`
- 投资域：`accounts`、`holdings`、`transactions`、`assetClasses`
- 指标与辅助：`exchangeRates`、`netvalue`、`disciplineNotes`、`settings`

## 关键文档入口

- 项目介绍与部署：`README.md`
- 数据库迁移手册：`docs/drizzle-operations-guide.md`
- OAuth 配置：`docs/github-oauth-setup.md`
- 历史完整概览（本文件归档）：`docs/project_overview.archive.md`

## 当前待改进项（摘要）

详见 `docs/improvement-proposals.md`：

- P2：给“资产配置设置”加一个可视化排序（上移/下移或拖拽）
- P3：收益率追踪、净值历史增强、币种动态化
- P3：汇率来源冗余、数据导入导出（移动端适配已完成）

## 进展日志（精简）

- [2026-02-24] 完成 MVP（账户/持仓/资产配置/汇率/每日净值）
- [2026-02-25] 完成交易系统重构与多页导航；新增 Windows 离线打包流程
- [2026-02-26] 完成双数据库（SQLite/PG）与多用户认证/鉴权/管理后台
- [2026-02-27] 完成移动端适配、市场页重构、纪律笔记与持仓 memo、数值精度统一
- [2026-02-28] 新增 Drizzle 运维手册与 README（项目介绍 + 部署指南）
- [2026-02-28] 归档历史完整版 `project_overview.md` 到 `docs/project_overview.archive.md`，当前文件改为简版协作文档
- [2026-02-28] 落地资产类别 `sortOrder` 排序方案：`asset_classes` 新增 `sort_order` 字段（SQLite/PG），API 查询改为显式排序并为新增类别自动分配末尾顺序，迁移脚本补齐历史数据回填（默认类与“股票基金”兼容）
- [2026-02-28] 修复持仓编辑接口 `PUT /api/holdings/[id]`：允许 `memo: null` 清空备注，避免编辑现价/成本价时误触发 400；资产类别改为仅在实际变更时校验，防止旧类别值阻塞其它字段保存
- [2026-02-28] 调整持仓交互：金额模式编辑支持同时修改成本与市值；新建持仓默认估值模式改为“份额模式”（账户页与交易页内联新建保持一致）
- [2026-02-28] 完成 OpenSpec 变更 `mobile-ui-and-asset-class-consistency` 实现：统一 Dialog 移动端高度/滚动与 44x44 关闭热区、重构 `batch-update` 移动端单列布局、移除页面内“返回 Dashboard”按钮，并在 API/前端展示层将“股票基金”归一为“股票”且应用默认顺序（股票/黄金/债券/现金）
- [2026-02-28] 微调弹窗关闭按钮样式：改为 36x36，移除红底红框，仅保留深红 `X` 图标并提高图标占比，兼顾显眼与不遮挡内容
- [2026-02-28] 修复纪律笔记交互瑕疵：移除“内容区域”，交易计划改为 Markdown 单区块（默认预览、点击编辑、失焦自动渲染），经典句子改为弹窗每次打开随机展示且不绑定便签、不可编辑并置于底部且无小标题
- [2026-02-28] 调整持仓行操作区交互：移除“交易记录”按钮，编辑/删除改为与账户操作一致的小图标（笔/垃圾桶），并放大强化“交易”按钮以提升可点击性与识别度
- [2026-02-28] 提升 holding 行 memo 可见性：改用更明显的笔记图标（NotebookText）并增强对比样式（橙色底+边框+阴影），桌面与移动端统一
- [2026-02-28] 新增 OpenSpec 变更 `visual-sort-for-asset-classes-and-holdings` 并完成 apply 前全部 artifacts（proposal/design/specs/tasks）：覆盖资产类别与标的可视化排序、持久化排序字段、API 稳定排序输出与历史数据兼容策略
- [2026-02-28] 扩展变更 `visual-sort-for-asset-classes-and-holdings`：新增交易页面规格改造（横向表格列顺序固定为账户/标的/操作类型/股数/股价/金额/手续费/日期，删除按钮统一为小垃圾桶样式）
- [2026-02-28] 进一步细化变更 `visual-sort-for-asset-classes-and-holdings`：持仓排序改为“排序按钮打开弹窗 + 拖拽句柄调整 + 点击保存后一次性写库”，弹窗列表仅展示名称/股票编号/账户归属三项核心信息
