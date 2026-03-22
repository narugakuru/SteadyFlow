## Why

当前市场页依赖 TradingView 图表和 `Stooq + Yahoo` 指数组合源，但实际使用中已经出现两个问题：一是 TradingView 高级图表存在付费约束，不适合作为产品内核心能力；二是除 A 股外，其他市场指数经常缺失，导致页面信息不完整。现在需要把市场页改为完全基于免费可控的数据与图表方案，同时补上更有决策价值的 VIX 和历史高点回撤信息。

## What Changes

- 删除市场页内嵌的 TradingView 图表区域，不再提供按市场切换的 TradingView 高级图表。
- 改造市场页指数数据聚合，使用 `Stooq + Tencent` 作为主要指数数据来源，修复美股、港股、日股等非 A 股市场缺失的问题。
- 在市场页最上方新增 VIX 波动率图表，使用非 TradingView 的免费组件展示，并接入免费官方历史数据源保留现有 VIX 说明能力。
- 将 VIX 说明组件改为更简洁的单态提示，只显示当前 VIX 数值所在区间对应的说明，不再同时展开全部区间说明。
- 在 VIX 区域下方新增“距历史最高点回撤”列表，展示用户关心的全球资产/指数/商品的历史新高日期、当前距历史高点跌幅与牛熊提示。

## Capabilities

### New Capabilities

- `market-ath-drawdown`: 提供市场页的历史高点日期与当前回撤列表，覆盖比特币、DAX、道琼斯、FTSE All-World、黄金、MSCI World、纳斯达克、日经、标普等跟踪标的。

### Modified Capabilities

- `market-overview`: 调整市场页指数表格的数据来源与展示结构，改为依赖 Stooq 和 Tencent，去除旧的 Yahoo 假设，并将 VIX 从原有“波动”分组图表流程中剥离。
- `market-chart-widget`: 用免费图表方案替换 TradingView 内嵌图表，只保留市场页顶部的 VIX 图表与简化后的区间说明，不再支持按市场 Tab 切换图表。

## Impact

- 影响页面与组件：`src/app/market/page.tsx`、VIX 说明组件、TradingView 图表组件的页面引用关系。
- 影响市场数据聚合：`src/app/api/market/route.ts`、`src/lib/data-source/market-config.ts`、`src/lib/data-source/market-data.ts` 以及新增/扩展的免费行情、VIX 官方历史数据适配层。
- 影响 API 返回结构：市场页需要同时返回指数快照、VIX 图表数据和 ATH 回撤摘要，供前端一次性渲染。
- 影响主 specs：`market-overview`、`market-chart-widget`，并新增 `market-ath-drawdown`。
