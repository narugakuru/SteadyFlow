## 1. 数据库 Schema 重命名

- [x] 1.1 `schema-sqlite.ts`：`export const snapshots` → `export const netvalue`，表名字符串 `"snapshots"` → `"netvalue"`，索引名 `snapshots_user_date_idx` → `netvalue_user_date_idx`
- [x] 1.2 `schema-pg.ts`：同上，`snapshots` → `netvalue`，索引名同步更新
- [x] 1.3 `schema.ts`：统一导出入口中 `snapshots` → `netvalue`
- [x] 1.4 创建 SQLite 迁移 SQL：`ALTER TABLE snapshots RENAME TO netvalue`
- [x] 1.5 创建 PG 迁移 SQL：`ALTER TABLE snapshots RENAME TO netvalue` + `ALTER INDEX snapshots_user_date_idx RENAME TO netvalue_user_date_idx`

## 2. API 路由重命名

- [x] 2.1 移动 `src/app/api/snapshots/route.ts` → `src/app/api/netvalue/route.ts`
- [x] 2.2 更新 route.ts 内部代码：所有 `snapshots` 表引用改为 `netvalue`，变量名/注释中的 snapshot 改为 netvalue

## 3. 页面路由重命名

- [x] 3.1 移动 `src/app/snapshots/page.tsx` → `src/app/netvalue/page.tsx`
- [x] 3.2 更新 page.tsx 内部代码：API 调用路径 `/api/snapshots` → `/api/netvalue`，变量名/注释中的 snapshot 改为 netvalue，页面标题"快照"改为"净值"

## 4. 组件文件重命名

- [x] 4.1 移动 `src/components/snapshot-charts.tsx` → `src/components/netvalue-charts.tsx`
- [x] 4.2 更新组件内部：导出名 `SnapshotCharts` → `NetvalueCharts`，变量名/注释同步
- [x] 4.3 更新所有引用 `snapshot-charts` 的 import 路径（netvalue page.tsx 等）

## 5. 类型与其他代码引用更新

- [x] 5.1 `lib/types.ts`：Snapshot 相关类型名重命名为 Netvalue
- [x] 5.2 `src/app/page.tsx`（Dashboard）：更新 snapshot 相关的 API 调用和变量名
- [x] 5.3 `src/components/navbar.tsx`：路由 `/snapshots` → `/netvalue`（标签已是"净值"无需改）
- [x] 5.4 `src/middleware.ts`：如有 snapshots 路由匹配规则，更新为 netvalue
- [x] 5.5 全局搜索 `snapshot` 确认无遗漏（排除 node_modules、archive、.next）

## 6. Spec 文档与项目文档更新

- [x] 6.1 重命名 spec 目录：`openspec/specs/daily-snapshot/` → `openspec/specs/daily-netvalue/`，内容中"快照"→"净值"、"snapshot"→"netvalue"
- [x] 6.2 更新 `openspec/specs/navigation-layout/spec.md`：路由和标签描述
- [x] 6.3 更新 `openspec/specs/user-data-isolation/spec.md`：snapshots 表引用改为 netvalue
- [x] 6.4 更新 `project_overview.md`：目录结构、数据模型、进展日志中的 snapshot/快照 引用
