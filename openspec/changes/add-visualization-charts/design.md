## Context

当前 Dashboard 已有一个单环饼图组件 `PortfolioChart`（使用 recharts），支持按大类/按标的切换。纪律表 `DisciplineTable` 是纯表格展示。快照历史页 `snapshots/page.tsx` 只有一个纯文字表格。

项目已安装 `recharts@^3.7.0`，无需新增依赖。

## Goals / Non-Goals

**Goals:**
- 升级现有饼图为双环饼图（外环实际、内环目标），保留按大类/按标的切换
- 新增偏离度水平柱状图，放在纪律表上方
- 纪律表「实际」列嵌入 CSS 进度条 + 目标标记线
- 快照历史页新增总资产走势折线图 + 资产类别占比堆叠面积图

**Non-Goals:**
- 回撤图（无收益率数据支持）
- 新增 API 端点（现有数据足够）
- 移动端专项适配（后续 P3）

## Decisions

### 1. 图表库：继续使用 recharts

项目已有 recharts，所有图表统一用它。不引入 Chart.js 或 d3 避免依赖膨胀。

### 2. 双环饼图：改造现有 PortfolioChart

在现有 `portfolio-chart.tsx` 上改造，新增一个内环 `<Pie>` 显示目标配置。外环保持现有逻辑（按大类/按标的切换），内环始终显示目标占比。使用 recharts 的多 Pie 嵌套实现。

### 3. 偏离度柱状图：新建 DeviationChart 组件

新建 `src/components/deviation-chart.tsx`，使用 recharts `BarChart` 水平布局。数据来源于现有 `AllocationItem[]` 的 deviation 字段。正值红色，负值绿色。放在纪律表上方。

### 4. 纪律表进度条：纯 CSS 实现

不使用 recharts，直接在 `discipline-table.tsx` 的「实际」列用 CSS 绘制进度条和目标标记线。这样更轻量，不需要为每行渲染一个图表实例。

### 5. 快照图表：新建 SnapshotCharts 组件

新建 `src/components/snapshot-charts.tsx`，包含折线图和堆叠面积图。数据来源于现有 `Snapshot[]`，在组件内做数据转换。颜色编码与饼图保持一致，复用 `CLASS_COLORS` 常量。

### 6. 颜色常量提取

将 `CLASS_COLORS` 从 `portfolio-chart.tsx` 提取到 `src/lib/chart-colors.ts`，供所有图表组件共享，确保颜色一致性。

## Risks / Trade-offs

- [快照数据量] 如果快照积累到数百条，折线图可能过于密集 → 后续可加日期范围筛选（P2 #7）
- [资产类别颜色] 新增资产类别时没有预设颜色 → 使用 fallback 颜色 `#6b7280`，与现有逻辑一致
- [纪律表进度条] 纯 CSS 方案在极端占比（如 0.5% 或 95%）时标记线可能不够明显 → 设置最小/最大显示宽度
