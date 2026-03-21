## 1. 市场数据聚合

- [ ] 1.1 重构 `market-config`，为指数快照、VIX 历史和 ATH 跟踪项拆分独立配置与 provider 标记
- [ ] 1.2 扩展 `lib/data-source`，实现基于 Stooq / Tencent 的市场快照、VIX 序列和 ATH 历史摘要聚合
- [ ] 1.3 改造 `/api/market` 返回复合响应结构，并补齐部分失败时的兜底字段

## 2. 市场页界面重构

- [ ] 2.1 从市场页移除 TradingView Tab 图表区域，改为顶部 VIX 图表卡片
- [ ] 2.2 重构 `vix-sentiment` 为单态区间说明组件，只显示当前 VIX 所在区间的说明
- [ ] 2.3 在 VIX 区域下方新增 ATH 回撤列表，并调整指数表格为美股 / A股 / 港股 / 日股四个分组

## 3. 验证与同步

- [ ] 3.1 清理市场页对 TradingView 图表组件的引用，确认旧组件保留但不再参与渲染
- [ ] 3.2 为 VIX 区间判定、ATH 计算和市场聚合兜底补充验证或测试
- [ ] 3.3 完成实现后同步 `openspec/specs`、`project_overview.md` 与相关项目文档，并执行 lint / typecheck
