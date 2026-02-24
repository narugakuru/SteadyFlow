## 1. 基础设施

- [x] 1.1 提取 `CLASS_COLORS` 和 `CLASS_GRADIENTS` 到 `src/lib/chart-colors.ts`，供所有图表组件共享
- [x] 1.2 更新 `portfolio-chart.tsx` 引用新的颜色常量文件

## 2. 双环饼图

- [x] 2.1 改造 `portfolio-chart.tsx`，新增内环 Pie 显示目标配置占比
- [x] 2.2 外环保持按大类/按标的切换，内环始终显示目标配置

## 3. 偏离度柱状图

- [x] 3.1 新建 `src/components/deviation-chart.tsx`，使用 recharts BarChart 水平布局，正值红色右向、负值绿色左向
- [x] 3.2 在 Dashboard 纪律表上方集成 DeviationChart 组件

## 4. 纪律表进度条

- [x] 4.1 在 `discipline-table.tsx` 的「实际」列嵌入 CSS 进度条（浅灰背景 + 填充色条 + 目标标记线）

## 5. 快照历史图表

- [x] 5.1 新建 `src/components/snapshot-charts.tsx`，实现总资产走势折线图（X轴日期、Y轴金额、Tooltip）
- [x] 5.2 在同组件中实现资产类别占比堆叠面积图（X轴日期、Y轴百分比、颜色与饼图一致）
- [x] 5.3 在 `snapshots/page.tsx` 中集成 SnapshotCharts，快照 >= 2 条时显示图表

## 6. 集成验证

- [x] 6.1 验证 Dashboard 页面：双环饼图、偏离度柱状图、纪律表进度条均正常渲染
- [x] 6.2 验证快照历史页：折线图和堆叠面积图正常渲染，数据不足时不显示
