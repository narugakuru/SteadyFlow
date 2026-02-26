## 1. TradingView Widget 组件封装

- [x] 1.1 创建 `src/components/tradingview/ticker-tape.tsx`：封装 Ticker Tape Widget，接收 symbols 配置，useEffect + useRef 动态加载脚本
- [x] 1.2 创建 `src/components/tradingview/mini-chart.tsx`：封装 Mini Symbol Overview Widget，接收单个 symbol 和标题
- [x] 1.3 创建 `src/components/tradingview/advanced-chart.tsx`：封装 Advanced Chart Widget，接收 symbol 配置

## 2. VIX 情绪指标组件

- [x] 2.1 创建 `src/components/vix-sentiment.tsx`：VIX 情绪阈值参考区域，展示 5 个级别的表情 + 文字 + 颜色 + 投资理念提示语

## 3. 市场页面

- [x] 3.1 创建 `src/app/market/page.tsx`：市场概览页面，组合 Ticker Tape（顶部）+ Mini Chart 网格（中部，2列，按市场分组）+ Advanced Chart VIX（底部）+ VIX 情绪提示
- [x] 3.2 配置所有指数的 TradingView symbol 映射，验证 symbol 前缀正确性

## 4. 导航栏更新

- [x] 4.1 修改 `src/components/navbar.tsx`：在 navItems 数组中"总览"之后添加 `{ href: "/market", label: "市场" }`

## 5. 验证

- [x] 5.1 验证页面加载正常，所有 Widget 渲染且使用深色主题
- [x] 5.2 验证导航栏"市场"项显示正确且高亮状态正常
