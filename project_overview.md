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
- P2：[修改memo交互逻辑，memo编辑弹窗优化](openspec/changes/discipline-notes-and-holding-memo)
- P2：[修改移动端UI](openspec/changes/mobile-ui-and-asset-class-consistency)
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
- [2026-02-28] 归档 OpenSpec 变更 `decimal-precision-config`：已同步 10 个 capability 的 delta specs 到主 `openspec/specs`，并新增 `number-formatting` 主 spec
- [2026-02-28] 修复持仓编辑接口 `PUT /api/holdings/[id]`：允许 `memo: null` 清空备注，避免编辑现价/成本价时误触发 400；资产类别改为仅在实际变更时校验，防止旧类别值阻塞其它字段保存
- [2026-02-28] 调整持仓交互：金额模式编辑支持同时修改成本与市值；新建持仓默认估值模式改为“份额模式”（账户页与交易页内联新建保持一致）
- [2026-02-28] 完成 OpenSpec 变更 `mobile-ui-and-asset-class-consistency` 实现：统一 Dialog 移动端高度/滚动与 44x44 关闭热区、重构 `batch-update` 移动端单列布局、移除页面内“返回 Dashboard”按钮，并在 API/前端展示层将“股票基金”归一为“股票”且应用默认顺序（股票/黄金/债券/现金）
- [2026-02-28] 调整弹窗关闭按钮样式：通用 Dialog 关闭按钮增大为 48x48，并改为高对比红色 `X`（红底红框），提升移动端可点按与可见性
