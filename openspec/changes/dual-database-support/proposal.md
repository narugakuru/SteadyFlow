## Why

项目准备部署到 Vercel，需要将数据库从本地 SQLite 迁移到云端 PostgreSQL（Neon）。同时希望保留 SQLite 支持，让用户可以选择本地部署（SQLite）或使用托管服务（PostgreSQL），通过配置文件切换。

## What Changes

- 新增 PostgreSQL schema 定义（`drizzle-orm/pg-core`），与现有 SQLite schema 保持表结构一致
- 重构 `src/db/index.ts`，根据环境变量 `DB_TYPE` 动态选择数据库驱动（`better-sqlite3` 或 `@neondatabase/serverless`）
- 新增 `drizzle-pg/` 目录存放 PostgreSQL 迁移文件，与现有 `drizzle/`（SQLite）并行
- 重构 `drizzle.config.ts` 支持双方言配置
- 重构 `src/db/seed.ts`，适配两种数据库的 API 差异（`.run()` vs `.execute()` 等）
- 更新 `.env` 配置，新增 `DB_TYPE` 和 `DATABASE_URL` 环境变量
- **BREAKING**：seed 和 migration 逻辑需适配异步 PostgreSQL 驱动

## Capabilities

### New Capabilities
- `dual-database`: 双数据库支持能力，涵盖 schema 双方言定义、动态连接切换、迁移管理、seed 适配

### Modified Capabilities
<!-- 无。account/holding/transaction 的用户可见行为不变，变化仅在数据库实现层（design 范畴）。 -->

## Impact

- **依赖变更**：新增 `@neondatabase/serverless`（或 `postgres`/`pg`）、`drizzle-orm/neon-http`
- **数据库层**：`src/db/` 目录重构，schema 拆分为 sqlite 和 pg 两套
- **迁移文件**：新增 `drizzle-pg/` 目录，`drizzle.config.ts` 需支持双配置
- **API 路由**：所有 `src/app/api/` 下的路由理论上无需改动（Drizzle query API 在两种方言间一致），但 seed 和部分同步调用需改为异步
- **部署**：Vercel 部署时使用 PostgreSQL，本地开发/独立打包继续使用 SQLite
