## Why

当前市场概览页依赖 Yahoo Finance 非官方 API 裸请求获取数据，稳定性差（反爬机制导致频繁失败）。API 失败时页面显示"无法获取市场数据"空白状态，完全不可用。即使没有实时数据，页面也应展示指数列表和跳转链接，保证基本可用性。同时缺少图表展示，用户无法直观查看指数走势。

## What Changes

- 替换 Yahoo Finance 裸请求为 `yahoo-finance2` npm 包，提升数据获取稳定性（自动处理 cookie/crumb 认证）
- 重构表格为静态骨架模式：指数名称和 TradingView 链接始终显示，API 失败时价格列显示 `--`，页面永不空白
- 新增下方图表区域：使用 TradingView Advanced Chart Widget 嵌入，按市场分 tab（A股/美股/港股/日股/波动率），每个 tab 展示该市场主要指数图表
- TradingView Widget 内可切换同市场不同指数；覆盖不到的指数提供跳转链接兜底
- 移除旧的 VIX 独立大字展示区域，VIX 归入波动率 tab 的图表中，VIX 情绪阈值参考保留
- 预留 Google Sheets 数据源扩展空间（本次不实现）

## Capabilities

### New Capabilities

- `market-chart-widget`: TradingView Advanced Chart Widget 嵌入，按市场分 tab 展示指数图表，支持 tab 内切换指数

### Modified Capabilities

- `market-overview`: 数据获取层从裸请求改为 yahoo-finance2；表格改为静态骨架+动态填充模式；页面布局重构为上方表格+下方图表双区域

## Impact

- 新增依赖：`yahoo-finance2`
- 修改文件：`src/lib/market-data.ts`（数据获取逻辑）、`src/app/market/page.tsx`（页面布局和组件）、`src/app/api/market/route.ts`（API 路由）
- 新增组件：TradingView chart widget 嵌入组件
- 无数据模型变更，无破坏性变更
