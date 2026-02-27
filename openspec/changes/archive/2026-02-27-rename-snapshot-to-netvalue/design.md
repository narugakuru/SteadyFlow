## Context

项目中"快照"功能的 UI 标签已手动改为"净值"，但代码层面仍全面使用 `snapshot(s)` 命名。涉及：
- 页面路由：`/snapshots`
- API 路由：`/api/snapshots`
- 数据库表：`snapshots`（SQLite + PG 双 schema）
- 组件文件：`snapshot-charts.tsx`
- 类型/变量：`Snapshot`、`snapshots` 等标识符
- Spec 文档：`daily-snapshot` spec 目录及内容
- 其他文档：`project_overview.md`、`navigation-layout`、`user-data-isolation` spec

## Goals / Non-Goals

**Goals:**
- 将所有 `snapshot` 命名统一为 `netvalue`，消除前后端命名差异
- 提供数据库迁移脚本（ALTER TABLE RENAME），保留现有数据
- 更新所有 spec 文档和项目文档中的相关描述

**Non-Goals:**
- 不改变功能逻辑，纯重命名
- 不修改数据库字段结构（列名、类型等不变）
- 不涉及 archive 目录中的历史 change 文档（已归档内容保持原样）

## Decisions

### 1. 数据库表名：`snapshots` → `netvalue`

使用 `ALTER TABLE RENAME` 而非 drop+recreate，保留现有数据和索引。SQLite 和 PG 都支持此操作。

唯一索引名从 `snapshots_user_date_idx` 改为 `netvalue_user_date_idx`（PG 需要单独 ALTER INDEX RENAME，SQLite 不支持索引重命名但 Drizzle 会在 push 时处理）。

### 2. API 路由：`/api/snapshots` → `/api/netvalue`

直接移动目录。前端调用路径同步更新。无需保留旧路由兼容（内部项目，无外部消费者）。

### 3. 页面路由：`/snapshots` → `/netvalue`

移动 `src/app/snapshots/` 目录到 `src/app/netvalue/`。

### 4. 组件文件：`snapshot-charts.tsx` → `netvalue-charts.tsx`

文件重命名，导出的组件名 `SnapshotCharts` → `NetvalueCharts`。所有 import 处同步更新。

### 5. Schema 导出名：`snapshots` → `netvalue`

`schema-sqlite.ts`、`schema-pg.ts` 中的 `export const snapshots` 改为 `export const netvalue`。`schema.ts` 统一导出入口同步。所有引用 `snapshots` 表的代码（API route、page、dashboard 等）更新 import。

### 6. Spec 目录重命名：`daily-snapshot` → `daily-netvalue`

主 spec 目录从 `openspec/specs/daily-snapshot/` 重命名为 `openspec/specs/daily-netvalue/`。内容中"快照"改为"净值"。

### 7. 中文术语映射

| 旧 | 新 |
|---|---|
| 快照 | 净值 |
| 快照历史 | 净值历史 |
| 每日快照 | 每日净值 |
| 刷新快照 | 刷新净值 |
| snapshot | netvalue |
| Snapshot | Netvalue |

## Risks / Trade-offs

- [数据库迁移] SQLite 的 ALTER TABLE RENAME 不会自动重命名索引 → Drizzle push/migrate 会处理索引同步，或手动 DROP+CREATE INDEX
- [遗漏引用] 全局搜索可能遗漏动态拼接的字符串 → 用 `snapshot` 关键词全项目搜索验证，排除 archive 和 node_modules
- [PG 迁移] Neon PG 需要在线执行 ALTER TABLE → 操作轻量，无锁表风险

## Migration Plan

1. 先执行数据库迁移 SQL（ALTER TABLE RENAME）
2. 更新 schema 文件（双数据库）
3. 移动文件目录（页面、API、组件）
4. 全局替换代码中的标识符
5. 更新文档和 spec
6. 全项目搜索 `snapshot` 确认无遗漏（排除 archive/node_modules）
