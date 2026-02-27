## Why

导航栏已手动将"快照"改为"净值"，但代码中仍大量使用 `snapshot` 命名（API 路由、数据库表名、组件文件名、变量名、spec 文档等）。前后端命名不一致会增加维护成本和认知负担，需要全面统一为"净值"（netvalue）。

## What Changes

- **路由重命名**：`/snapshots` → `/netvalue`，`/api/snapshots` → `/api/netvalue`
- **数据库表重命名**：`snapshots` 表 → `netvalue`（SQLite + PG 双 schema 同步），表内字段名不变
- **组件文件重命名**：`snapshot-charts.tsx` → `netvalue-charts.tsx`，内部导出名同步更新
- **代码标识符重命名**：所有 `snapshot`/`snapshots` 相关的变量名、类型名、函数名统一改为 `netvalue`
- **文档更新**：主 spec（`daily-snapshot` → `daily-netvalue`）、`navigation-layout` spec、`user-data-isolation` spec、`project_overview.md` 中所有"快照"/"snapshot"描述统一改为"净值"/"netvalue"
- **迁移文件**：提供 SQLite + PG 的 ALTER TABLE RENAME 迁移 SQL

## Capabilities

### New Capabilities

（无新增能力）

### Modified Capabilities

- `daily-snapshot`: 重命名为 `daily-netvalue`，所有"快照"描述改为"净值"，API 路由从 `/api/snapshots` 改为 `/api/netvalue`，数据库表从 `snapshots` 改为 `netvalue`
- `navigation-layout`: 导航项路由从 `/snapshots` 改为 `/netvalue`，标签从"快照"改为"净值"
- `user-data-isolation`: snapshots 表引用改为 netvalue 表

## Impact

- **API 路由**：`/api/snapshots/route.ts` → `/api/netvalue/route.ts`（**BREAKING**：前端调用路径变更）
- **页面路由**：`/snapshots/page.tsx` → `/netvalue/page.tsx`
- **数据库**：`snapshots` 表重命名为 `netvalue`，需要迁移脚本
- **Schema**：`schema-sqlite.ts`、`schema-pg.ts`、`schema.ts` 中 snapshots 导出改为 netvalue
- **组件**：`snapshot-charts.tsx` 重命名，所有引用处更新 import
- **类型**：`types.ts` 中 Snapshot 相关类型重命名
- **中间件**：`middleware.ts` 中如有 snapshots 路由匹配需更新
- **Spec 文档**：3 个主 spec + `project_overview.md` 需更新
