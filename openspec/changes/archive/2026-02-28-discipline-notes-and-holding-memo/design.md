## Context

现有系统已覆盖账户、持仓、交易与纪律表，但缺少统一的纪律记录入口。用户希望在任意页面快速打开笔记，并在一个中心大弹窗内管理多条便签式笔记（支持 Markdown 渲染），同时在持仓层补充备注并通过悬浮提示快速查看。该变更同时涉及全局布局、数据库模型、API、持仓编辑与列表展示，属于跨模块改造。

## Goals / Non-Goals

**Goals:**

- 提供全局悬浮圆形笔记入口，且层级低于现有 Dialog/Sheet，不干扰其他弹窗操作。
- 提供笔记中心弹窗，固定从上到下结构：投资笔记、经典句子、交易计划、内容区域。
- 支持多条便签式笔记的创建、编辑、删除与列表切换，并以 Markdown 渲染内容。
- 为持仓增加 memo 字段，并在编辑弹窗可维护；在持仓行提供备注标识与悬浮/点击查看。

**Non-Goals:**

- 不实现协同编辑、笔记分享、版本历史或全文检索。
- 不引入富文本编辑器（仅支持 Markdown 文本输入与渲染）。
- 不改动交易撮合、盈亏算法与资产配置核心逻辑。

## Decisions

### 1) 新增独立 discipline notes 数据模型与 API

- Decision: 新增 `disciplineNotes` 表（`id`, `userId`, `title`, `quote`, `plan`, `content`, `createdAt`, `updatedAt`），并提供 `/api/discipline-notes` CRUD。
- Rationale: 该能力与持仓、交易无直接实体关系，独立建模更清晰，便于后续扩展（如归档、标签）。
- Alternative considered:
  - 复用 `settings` 存 JSON：实现快，但不利于多条笔记查询与分页，结构演进成本高。

### 2) 全局悬浮按钮挂载在 `app/layout.tsx`，使用固定定位

- Decision: 在全局布局注入客户端组件 `DisciplineNotesFab`，`position: fixed` 右下角；z-index 高于页面内容但低于 shadcn Dialog/Sheet。
- Rationale: 满足“任意页面可达”和“被其他弹窗遮挡”的交互要求。
- Alternative considered:
  - 放在 `navbar`：移动端/滚动状态下可达性不稳定，不符合“常驻悬浮入口”。

### 3) Markdown 渲染采用轻量链路

- Decision: 输入保持纯文本，展示使用 Markdown 渲染组件（例如 `react-markdown` + 基础样式约束），禁用原始 HTML。
- Rationale: 满足“简单 md 渲染”，并控制 XSS 风险和实现复杂度。
- Alternative considered:
  - 富文本编辑器：功能过重，超出本次目标。

### 4) 持仓备注作为 `holdings.memo` 可空字段

- Decision: 在 SQLite/PG 双 schema 的 holdings 表新增 `memo`（text nullable），API 与 `HoldingEditDialog` 支持读写。
- Rationale: 备注是持仓局部信息，紧贴实体最自然；避免额外关联表查询开销。
- Alternative considered:
  - 新建 holding_notes 表：扩展性更高，但当前仅需单条备注，增加复杂度无必要。

### 5) 备注展示策略区分桌面与移动端

- Decision: `HoldingRow` 中有 memo 时显示图标；桌面端 hover Tooltip 展示，移动端点击图标弹 Popover。
- Rationale: 与现有交互一致，兼容无 hover 的触控设备。
- Alternative considered:
  - 永久展开显示备注：信息噪音高，影响列表扫描效率。

## Risks / Trade-offs

- [Markdown 渲染引入安全风险] -> 禁用 HTML 直出，仅渲染 Markdown 语法；限制允许的元素与样式。
- [全局 FAB 与现有浮层冲突] -> 明确 z-index 分层并在 Dialog/Sheet 打开时验证遮挡优先级。
- [新增字段导致双数据库迁移不一致] -> SQLite/PG schema 与迁移文件同步提交，并在两种 DB_TYPE 下回归创建/编辑流程。
- [笔记入口常驻引发布局遮挡] -> 在移动端控制尺寸与边距，避开底部安全区和主要操作按钮。

## Migration Plan

1. 新增 `disciplineNotes` 表与 `holdings.memo` 字段（SQLite + PG + drizzle 迁移）。
2. 扩展类型定义与 API（notes CRUD、holdings memo 读写）。
3. 增加全局 FAB 与笔记弹窗组件，接入 `app/layout.tsx`。
4. 改造 `HoldingEditDialog` 与 `HoldingRow`，实现备注编辑和展示。
5. 在 SQLite 与 PostgreSQL 下验证：迁移、笔记 CRUD、持仓备注展示、移动端点击查看。
6. 若需回滚：移除前端入口并停用 notes API；保留新增字段不影响旧功能运行（软回滚）。

## Open Questions

- 经典句子来源是否固定内置（前端随机）还是允许用户自定义维护？
- 笔记默认排序采用“最近更新优先”还是“创建顺序”？
- 是否需要限制单条笔记 Markdown 内容长度（如 5k/10k 字符）以保护移动端性能？
