# InvestManage 项目概览（简版）

> 本文件用于多终端协作快速同步状态。历史完整版本见 `docs/project_overview.archive.md`。

## 项目定位

个人投资组合管理 Web 工具，替代 Excel 管理多平台资产，覆盖账户、持仓、交易、净值、纪律提醒与市场概览。

## 当前状态（2026-03-03）

- 阶段：多用户平台化版本已落地（Auth.js + 用户隔离 + 管理后台）。
- 运行模式：`DB_TYPE=sqlite`（本地）或 `DB_TYPE=postgres`（Vercel + Neon）。
- 核心页面已稳定：总览、账户、交易、净值、股价更新、市场、登录/注册、管理后台。
- 客户端缓存架构已接入：全站采用 Query Cache + IndexedDB 持久化（缓存优先展示，按 `staleTime=60s` 条件后台刷新，`persist=3d`）。
- 自动报价路由已升级：港/A/北交所默认走腾讯简易行情接口，EODHD 次级回退，Twelve Data 最低权重可选备份。
- OpenSpec 流程在用：变更通过 `openspec/changes` 管理，归档后同步到 `openspec/specs`。

## 技术栈（摘要）

- 前端：Next.js 16 (App Router)、React 19、TypeScript、Tailwind CSS 4、shadcn/ui
- 客户端数据层：TanStack Query + Persist Client + Async Storage Persister + IndexedDB (`idb-keyval`)
- 后端：Next.js Route Handlers、Drizzle ORM
- 数据库：SQLite (`better-sqlite3`) / PostgreSQL (Neon serverless)
- 认证：Auth.js v5 (`next-auth@beta`) + Credentials + GitHub OAuth

## 目录结构（摘要）

```text
src/
  app/          # 页面与 API 路由
  components/   # UI 与业务组件
  db/           # schema、连接、迁移启动与 seed
  lib/          # 分层库代码（含 lib/cache、lib/auth、lib/services、lib/utils、lib/visualization、lib/data-source）
docs/           # 运维与说明文档
openspec/       # 需求规格与变更流程

```

## 数据模型（核心表）

- 认证与用户：`users`, `authAccounts`, `sessions`, `verificationTokens`
- 投资域：`accounts`, `holdings`, `transactions`, `assetClasses`
- 指标与辅助：`exchangeRates`, `netvalue`, `disciplineNotes`, `settings`

## 关键文档入口

- 项目介绍与部署：`README.md`
- 数据库迁移手册：`docs/drizzle-operations-guide.md`
- OAuth 配置：`docs/github-oauth-setup.md`
- 历史完整概览：`docs/project_overview.archive.md`

## 当前待改进项（摘要）

- P2：历史收益率追踪，交易将持仓盈亏转为了结盈亏
- P2：每天corn自动更新股价和净值
- P3：净值历史增强、可设置主要币种
- P3：数据导入导出

---

## 进展日志

进展日志按照**新到旧（最新在前）**的顺序排版，且描述适当精简。

- [2026-03-03] 修复页面首屏误报“加载失败”闪烁：将 Dashboard/Accounts/Admin/Transactions/Netvalue/BatchUpdate/Market 的加载判定纳入 `sessionStatus === "loading"`，避免会话未就绪时把“暂无数据”错误渲染为失败状态。
- [2026-03-03] 历史质量问题修复：清理 `admin` API 中显式 `any`、修复 `useTriFieldLinked/useFetch` 的 React Hooks lint 违规，并为 Node 脚本入口补齐 CommonJS lint 规则豁免；`lint` 与 `typecheck` 均通过（仅剩 `navbar` 的 `<img>` 优化 warning）。
- [2026-03-03] `src/lib` 继续细分：新增 `lib/auth`、`lib/services`、`lib/utils`，完成认证/服务/工具与类型文件迁移，并全量更新业务代码导入路径。
- [2026-03-03] `src/lib` 目录重构：新增 `lib/visualization`（图表与展示配色）与 `lib/data-source`（行情/汇率供应商与市场数据聚合），并完成全量导入路径迁移。
- [2026-03-03] 实现 `global-local-cache-swr`：接入 TanStack Query + IndexedDB 持久化与统一 `policy.ts`；完成 Dashboard/Accounts/Transactions/BatchUpdate/Netvalue/Market/Admin 页面缓存优先读取迁移；新增后台刷新失败通知条、低侵入数据新鲜度展示、登出与 401 缓存清理、跨标签页失效同步。
- [2026-03-03] 品牌文案统一：浏览器标签页全局标题由“资产组合管理”改为 `SteadyFlow`（`src/app/layout.tsx` metadata.title）。
- [2026-03-03] OpenSpec：新增 `global-local-cache-swr` 变更工件（proposal/design/specs/tasks），确定全站本地缓存架构方向（`staleTime=60s`、`persist=3d`、缓存优先展示与条件异步刷新、刷新失败通知条）。
- [2026-03-03] 自动报价路由重构：`/api/holdings/fetch-prices` 亚洲市场改为 Tencent 主、EODHD 次、Twelve Data 最低权重备份；新增 `.BJ`（北交所）映射；移除 Twelve Data 历史 65s 批次等待，供应商请求链路不再使用固定秒级延时。
- [2026-03-03] 自动化与调度：上线 `Vercel Cron` 每日自动记录净值；新增 `netvalue.timezone` 用户设置，实现按时区自动 upsert。
- [2026-03-03] 股价引擎增强：集成 Twelve Data 与 EODHD 供应商，支持港/A股多候选匹配及美股映射（如 BRK.B）；新增股价更新明细弹窗，透传供应商原始错误。
- [2026-03-03] 交互优化：Dashboard 移除手动记录净值按钮；优化资产偏离图移动端尺寸；统一“更新股价”按钮样式与加载反馈。
- [2026-02-28] 可视化排序：实现资产类别与持仓的拖拽排序（Drag-and-Drop）；解耦“账户视图”与“纪律总览”的独立排序权重。
- [2026-02-28] 移动端适配 (OpenSpec)：统一 Dialog 高度、44x44 点击热区；重构批量更新页为单列布局；增强持仓备注（Memo）图标可见性。
- [2026-02-28] 功能细节：持仓编辑支持同时修改成本与市值；重构纪律笔记为 Markdown 模式（预览/编辑切换）；规范交易页横向表格列顺序。
- [2026-02-27] 完成移动端适配、市场页重构、纪律笔记与持仓 Memo。
- [2026-02-26] 完成双数据库（SQLite/PG）支持与多用户 Auth.js 认证体系。
- [2026-02-25] 完成交易系统重构；新增 Windows 离线打包流程。
- [2026-02-24] 完成 MVP 版本（账户/持仓/资产配置/汇率/每日净值）。
