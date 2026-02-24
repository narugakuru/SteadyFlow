## Context

当前使用 Excel 管理个人投资组合，资金分散在国内外多个平台（A股券商、美股券商、港股券商、银行、支付宝等）。Excel 的仓位管理和纪律提醒功能不足，需要构建一个轻量级 Web 应用替代。

项目为全新构建，无现有代码基础。目标用户为个人投资者（先自用，后期分享给技术小白）。

## Goals / Non-Goals

**Goals:**
- 构建可本地运行的 Web 应用，管理多账户、多币种的投资组合
- 实现资产配置纪律的量化监控（目标占比 vs 实际占比 vs 偏离警告）
- 提供账户视角和资产类别视角的双维度数据展示
- 每日快照记录资产历史状态
- 架构上保留迁移到 Electron / Vercel + Supabase 的可能性

**Non-Goals:**
- 不做自动行情拉取（后期拓展）
- 不做交易执行功能
- 不做用户认证系统（单用户本地使用）
- 不做历史数据可视化图表（后期拓展，先做快照存储）
- 不做移动端适配（先 PC 浏览器）

## Decisions

### 1. 框架选型：Next.js (App Router)
**选择**: Next.js 14+ with App Router
**理由**: 前后端一体，API Routes 可直接操作 SQLite；App Router 是 Next.js 的未来方向；迁移到 Vercel 零配置，迁移到 Electron 也有成熟方案（nextron / electron-next）。
**替代方案**: Vite + Express（更轻量但需要分别维护前后端）、Remix（生态不如 Next.js 成熟）。

### 2. 数据库：SQLite + Drizzle ORM
**选择**: better-sqlite3 + Drizzle ORM
**理由**: SQLite 零配置、单文件、本地运行完美；Drizzle 类型安全、轻量、支持 SQLite 和 Postgres，未来迁移到 Supabase 时只需换 driver。
**替代方案**: Prisma（更重，SQLite 支持不如 Drizzle 好）、raw SQL（缺乏类型安全）。

### 3. UI 框架：shadcn/ui + Tailwind CSS
**选择**: shadcn/ui 组件库 + Tailwind CSS
**理由**: shadcn/ui 是复制到项目中的组件，不是 npm 依赖，完全可控；Tailwind 是 Next.js 默认支持的样式方案；组件质量高，适合快速搭建 Dashboard。
**替代方案**: Ant Design（偏重，中文生态好但包体积大）、Material UI（风格不够简洁）。

### 4. 汇率 API：ExchangeRate-API 免费接口
**选择**: exchangerate-api.com 免费版（每月 1500 次请求）
**理由**: 免费、无需注册、返回 JSON 格式简单。每日缓存一次汇率到 SQLite，实际请求量极低。
**替代方案**: Open Exchange Rates（需注册）、手动输入汇率（不够自动化）。

### 5. 数据模型：矩阵方案
**选择**: Holding 同时关联 Account 和 Asset Class，双维度独立
**理由**: 支持从账户视角和资产类别视角两个方向查看数据，不需要冗余存储。现金通过 `账户总额 - Σ持仓市值` 自动计算，不作为 Holding 存储。

### 6. 快照策略：每日全量快照
**选择**: 每日记录一条快照，存储各资产类别的金额和占比
**理由**: 数据量极小（每天一行），查询简单，后期做图表时直接读取即可。不记录每个 Holding 的历史（过于细粒度，暂不需要）。

## Risks / Trade-offs

- [SQLite 并发限制] → 单用户场景无影响；未来多用户需迁移到 Postgres
- [汇率 API 不可用] → 使用缓存的最近一次汇率，UI 显示"汇率更新时间"提示用户
- [better-sqlite3 在 Electron 中需要 rebuild] → 已有成熟方案（electron-rebuild），不是阻塞问题
- [每日快照需要触发机制] → 用户打开应用时检查当天是否已快照，未快照则自动创建；不依赖 cron job
