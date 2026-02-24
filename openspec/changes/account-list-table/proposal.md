## Why

当前账户列表使用紧凑的单行布局，但信息层次不够清晰，总额、现金、持仓等关键数据混在一行中不易对比。将账户列表改为类似资产配置纪律表的表格形式，可以让各列数据对齐、一目了然，提升信息可读性和对比效率。

## What Changes

- 账户列表从单行卡片布局改为结构化表格（table），列包含：账户名称、币种、总额、现金余额、持仓市值、持仓数量、操作
- 表格行可点击进入账户持仓详情（保持现有交互）
- 操作列使用 icon button（编辑/删除），与现有风格一致
- 表格底部可选显示汇总行（总计 CNY）

## Capabilities

### New Capabilities

### Modified Capabilities
- `dashboard`: 账户列表区域从单行布局改为表格布局

## Impact

- 影响组件：`account-list.tsx`
- 影响页面：`page.tsx`（AccountList 的 props 不变，仅内部布局变化）
- 无 API 变更，无数据库变更
