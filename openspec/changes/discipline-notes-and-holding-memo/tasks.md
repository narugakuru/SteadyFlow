## 1. 数据模型与迁移

- [ ] 1.1 在 `schema-sqlite.ts` 与 `schema-pg.ts` 新增 `disciplineNotes` 表（含 userId 外键、title、quote、plan、content、timestamps）。
- [ ] 1.2 在 `holdings` 表新增可空 `memo` 字段，并更新对应类型导出。
- [ ] 1.3 生成并提交 SQLite/PG 迁移文件，确保两种 DB_TYPE 都可完成建表/加字段。

## 2. 纪律笔记 API

- [ ] 2.1 新增 `/api/discipline-notes` 列表与创建接口，按当前登录用户隔离数据。
- [ ] 2.2 新增 `/api/discipline-notes/[id]` 详情更新与删除接口，校验资源归属。
- [ ] 2.3 为笔记 API 增加输入校验与错误响应（必填字段、非法 id、越权访问）。

## 3. 全局悬浮入口与笔记弹窗

- [ ] 3.1 新建全局客户端组件（如 `discipline-notes-fab.tsx`），实现右下角圆形图标入口（无文字）。
- [ ] 3.2 在 `app/layout.tsx` 接入该组件，并设置 z-index 低于 Dialog/Sheet。
- [ ] 3.3 实现居中大弹窗，固定区块顺序为“投资笔记 -> 经典句子 -> 交易计划 -> 内容区域”。

## 4. 多笔记与 Markdown 体验

- [ ] 4.1 实现多条便签式笔记列表与切换（最近更新优先），支持新建、编辑、删除。
- [ ] 4.2 接入 Markdown 渲染（禁用原始 HTML），实现编辑态与预览态切换。
- [ ] 4.3 内置并展示经典价值投资/纪律投资句子提示（打开弹窗即可见）。

## 5. 持仓备注改造

- [ ] 5.1 扩展 holdings API 的读写字段，支持 `memo` 持久化与返回。
- [ ] 5.2 在 `holding-edit-dialog.tsx` 增加 memo 多行输入并接入保存。
- [ ] 5.3 在 `holding-row.tsx` 为有 memo 的标的显示备注图标，桌面端 hover Tooltip、移动端点击 Popover 展示内容。

## 6. 回归验证

- [ ] 6.1 在 SQLite 下验证：笔记 CRUD、全局悬浮入口层级、持仓备注编辑与显示。
- [ ] 6.2 在 PostgreSQL 下验证同样流程，确认迁移与运行一致。
- [ ] 6.3 补充/更新相关测试与文档，确保 lint/typecheck 通过且无现有功能回归。
