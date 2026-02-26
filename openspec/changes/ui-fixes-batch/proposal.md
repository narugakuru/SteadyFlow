## Why

总览页饼图 Tooltip 显示金额符号而非百分比、账户详情交易后展开状态丢失、股价更新页 shares 模式持仓缺少关键字段（股数/股价/市值联动编辑），这三个 UI 瑕疵影响日常使用体验，需要一并修复。

## What Changes

- 饼图 Tooltip 格式修复：内环（目标配置）Tooltip 显示百分比（如 `40%`）而非金额（`¥40`），外环保持显示金额
- 账户列表展开状态保持：在持仓行内完成交易或编辑后，账户展开/折叠状态不再重置，数据刷新时保留当前展开的账户
- 股价更新页 shares 模式增强：shares 模式持仓显示市值、股数、股价三个字段；市值和股价可编辑，编辑其中一个自动计算另一个（股数固定）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `batch-update`: shares 模式持仓从单一市值编辑改为市值/股价双字段联动编辑，API 支持同时更新 marketValue 和 price
- `portfolio-chart`: 饼图内环 Tooltip 从金额格式改为百分比格式
- `account-management`: 账户列表交易/编辑回调后保持展开状态不收缩

## Impact

- `src/components/portfolio-chart.tsx`：修改 Tooltip formatter，区分内环/外环数据格式
- `src/components/account-list.tsx`：修改 `handleDataChange` 回调逻辑，避免触发展开状态重置
- `src/app/batch-update/page.tsx`：shares 模式持仓行改为三字段展示（市值、股数、股价），市值和股价可编辑并联动计算
- `src/app/api/batch-update/route.ts`：API 支持接收 price 字段，shares 模式同时更新 marketValue 和 price
