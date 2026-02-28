## Why

当前系统缺少一个随时可达的“投资纪律层”，无法支持开盘前交易计划记录、经典价值投资提示和执行复盘，也无法在持仓层面沉淀明确的加减仓纪律。新增该能力可以降低情绪化交易，提升策略执行一致性。

## What Changes

- 新增全局纪律笔记能力：任意页面右下角悬浮圆形笔记入口，点击后打开居中的大弹窗。
- 笔记弹窗固定内容结构为“投资笔记标题、经典句子、交易计划、Markdown 内容区域”，支持用户自由创建多条便签式笔记。
- 为持仓增加可编辑文字备注，用于记录目标卖出价、加仓价位和持仓逻辑。
- 在持仓列表中为有备注标的提供可见标识，并在桌面端悬浮时弹出备注内容（移动端采用点击查看）。

## Capabilities

### New Capabilities

- `discipline-notes`: 提供全局悬浮入口与多条 Markdown 纪律笔记管理，支持经典投资句子提示和交易计划记录。

### Modified Capabilities

- `holding-management`: 扩展持仓数据与交互，支持备注编辑、标识展示与悬浮/点击查看备注内容。

## Impact

- Affected specs: `openspec/specs/discipline-notes/spec.md`（新增）、`openspec/changes/discipline-notes-and-holding-memo/specs/holding-management/spec.md`（变更）。
- Affected data model: `holdings` 表新增备注字段；新增纪律笔记相关数据表（如 notes）。
- Affected UI: 全局布局增加悬浮入口与笔记弹窗；持仓编辑弹窗与持仓行交互更新。
- Affected API: 新增纪律笔记 CRUD 路由；持仓读写接口支持 memo 字段。
