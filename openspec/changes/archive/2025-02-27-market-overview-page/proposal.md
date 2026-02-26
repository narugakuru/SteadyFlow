## Why

当前工具只关注"自己的组合"，缺少对外部市场环境的感知。用户需要在同一个应用内快速了解全球主要指数走势和市场情绪（VIX），以辅助投资决策。通过嵌入 TradingView 免费 Widget，零后端成本即可实现实时市场数据展示。

## What Changes

- 新增 `/market` 页面，展示全球主要股指和恐慌/波动指标
- 页面分三个区域：顶部 Ticker Tape 滚动条、中部指数 Mini Chart 网格、底部 VIX 图表 + 情绪阈值提示
- 导航栏新增"市场"项，位于"总览"之后
- VIX 区域包含表情 + 文字的情绪阈值提示系统（平静/正常/加剧/恐慌/极度恐慌）

## Capabilities

### New Capabilities

- `market-overview`: 全球市场概览页面，包含指数展示（TradingView Widget 嵌入）和 VIX 情绪指标

### Modified Capabilities

- `navigation-layout`: 导航栏新增"市场(/market)"导航项，位于"总览"之后

## Impact

- 前端新增 `/market` 路由和页面组件
- 导航栏组件 `src/components/navbar.tsx` 新增导航项
- 引入 TradingView Widget 外部脚本（通过 script 标签嵌入，无 npm 依赖）
- 无后端 API 变更，无数据库变更
