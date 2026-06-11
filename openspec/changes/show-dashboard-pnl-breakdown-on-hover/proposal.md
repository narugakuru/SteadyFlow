## Why

常驻展示持仓盈亏和了结盈亏会破坏总览顶部的简洁层级。用户需要保留原有资产数字和账户总盈亏的干净观感，同时在需要时能查看盈亏拆分。

## What Changes

- 保持 Dashboard 总览净值视图左侧资产数字和账户总盈亏数字的原有布局。
- 鼠标悬停到左侧总资产数字或账户总盈亏数字时，显示持仓盈亏和了结盈亏的金额/百分比拆分。
- 拆分浮层使用轻量提示样式，不新增常驻右侧指标。
- 盈亏颜色继续遵循设置中的 A股/美股涨跌颜色模式。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dashboard`: 将总览盈亏拆分从常驻展示调整为资产/盈亏数字 hover 时的轻量提示。

## Impact

- Affected UI: Dashboard overview asset-trend header.
- Affected specs: `openspec/specs/dashboard/spec.md`.
- No API, database, migration, dependency, or route changes.
