## 1. 核心格式化模块

- [x] 1.1 创建 `src/lib/format.ts`，定义 `PRECISION` 配置常量
- [x] 1.2 实现 `formatNumber(value, maxDecimals)` 底层通用函数
- [x] 1.3 实现 `formatAmount()`、`formatPercent()`、`formatPrice()`、`formatShares()` 便捷函数
- [x] 1.4 实现 `formatRate()` 汇率格式化函数（固定4位小数）
- [x] 1.5 实现 `roundForStorage(value, category?)` 存储截断函数

## 2. API 层存储精度截断

- [x] 2.1 `src/app/api/holdings/route.ts` — 持仓写入时对 cost/marketValue/shares/price 调用 `roundForStorage()`
- [x] 2.2 `src/app/api/transactions/route.ts` — 交易写入时对 amount/shares/price/fee 调用 `roundForStorage()`
- [x] 2.3 `src/app/api/accounts/route.ts` — 账户写入时对 cashBalance 调用 `roundForStorage()`
- [x] 2.4 `src/app/api/asset-classes/route.ts` — 资产类别写入时对 targetPct 调用 `roundForStorage()`
- [x] 2.5 `src/app/api/asset-allocation/route.ts` — API 响应中的计算值（actualPct/deviation/returnRate/pnlAmount 等）替换 `.toFixed()` 为 `roundForStorage()`
- [x] 2.6 `src/app/api/netvalue/route.ts` — 净值写入时对 totalAssetCny 调用 `roundForStorage()`
- [x] 2.7 `src/lib/exchange-rate.ts` — 汇率获取和换算结果调用 `roundForStorage()`

## 3. 组件层显示格式化

- [x] 3.1 `src/components/account-list.tsx` — 替换金额/盈亏的 `.toFixed()` 和 `toLocaleString()` 为 `formatAmount()`/`formatPercent()`
- [x] 3.2 `src/components/holding-row.tsx` — 替换市值/盈亏/价格/份额/占比的格式化为对应的 `formatAmount()`/`formatPrice()`/`formatShares()`/`formatPercent()`
- [x] 3.3 `src/components/discipline-table.tsx` — 替换百分比/金额的格式化为 `formatPercent()`/`formatAmount()`
- [x] 3.4 `src/components/asset-class-view.tsx` — 替换金额/百分比的格式化为 `formatAmount()`/`formatPercent()`
- [x] 3.5 `src/components/portfolio-chart.tsx` — 替换图表 tooltip 中的金额格式化为 `formatAmount()`
- [x] 3.6 `src/components/netvalue-charts.tsx` — 替换图表 tooltip 中的金额格式化为 `formatAmount()`
- [x] 3.7 `src/components/rebalance-panel.tsx` — 替换金额格式化为 `formatAmount()`
- [x] 3.8 `src/components/transaction-form.tsx` — 替换金额格式化为 `formatAmount()`
- [x] 3.9 `src/components/holdings-panel.tsx` — 替换数值格式化为统一函数（如仍有引用）
- [x] 3.10 `src/lib/hooks.ts` — 三字段联动计算结果使用 `roundForStorage()` 截断

## 4. 验证与清理

- [x] 4.1 全局搜索 `.toFixed(` 确认无遗漏（汇率的 `.toFixed(4)` 应已替换为 `formatRate()`）
- [x] 4.2 全局搜索 `toLocaleString()` 确认无遗漏的数值格式化调用
- [x] 4.3 构建验证，确保无类型错误
