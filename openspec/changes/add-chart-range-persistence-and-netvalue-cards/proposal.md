## Why

总览页和净值页都依赖净值图表数据，但当前默认区间、视觉层级和坐标轴展示不一致，导致总览的常用视角无法记忆，净值页图表也与近期总览卡片风格割裂。

本次变更统一净值相关图表的时间范围体验与卡片化展示，让总览默认落在更常用的 30D 视角，同时保留用户最近选择。

## What Changes

- 总览资产趋势图新增并明确展示 `7d` 时间范围选项。
- 总览资产趋势图默认选择 `30d`，并将用户选择持久化到浏览器本地缓存。
- 净值页两个图表改为与总览一致的浅色卡片风格。
- 净值页图表隐藏 Y 轴和常规坐标轴视觉，仅在底部保留日期标签。
- 净值页总资产走势图去除明显的数据点，仅保留连续走势线与 Tooltip 交互。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `dashboard`: 总览资产趋势图范围选项、默认值和本地持久化行为变化。
- `visualization-charts`: 总览/净值图表范围、净值页卡片风格、坐标轴和数据点展示规则变化。
- `client-cache-layer`: 浏览器本地持久化偏好新增总览图表范围选择。

## Impact

- 前端页面：`src/app/page.tsx`、`src/app/netvalue/page.tsx`
- 图表组件：`src/components/overview-asset-trend.tsx`、`src/components/netvalue-charts.tsx`
- 类型与净值范围工具：`src/lib/utils/types.ts`、`src/lib/services/netvalue-history-helpers.ts`
- API：`GET /api/netvalue/chart` 需要接受 `7d` 区间并映射到日级粒度。
- 文档与规格：同步更新 OpenSpec change、主规格与 `project_overview.md`。
