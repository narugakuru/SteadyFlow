## 1. 数据获取层重构

- [ ] 1.1 安装 yahoo-finance2 依赖
- [ ] 1.2 重写 `src/lib/market-data.ts`：使用 yahoo-finance2 的 quote 方法替代裸 HTTP 请求，保留 INDEX_CONFIG 静态配置和 MarketIndex 接口，失败时返回空价格数据而非空数组
- [ ] 1.3 更新 `src/app/api/market/route.ts`：适配新的 fetchMarketData 返回格式，确保始终返回完整的指数列表（含空价格）

## 2. 表格静态骨架重构

- [ ] 2.1 重构 `src/app/market/page.tsx` 表格渲染逻辑：从 INDEX_CONFIG 静态生成表格行，API 数据仅填充价格列
- [ ] 2.2 实现 API 失败兜底：价格/涨跌/涨跌幅显示 `--`，更新时间显示 `-`，TradingView 链接始终可用
- [ ] 2.3 实现加载中状态：表格骨架正常显示，价格列显示加载占位符

## 3. TradingView 图表组件

- [ ] 3.1 创建 `src/components/tradingview-chart.tsx`：封装 TradingView Advanced Chart Widget（iframe 嵌入），接收 symbol 参数，配置深色主题
- [ ] 3.2 处理 Widget 加载失败兜底：显示"该指数暂不支持图表展示"提示 + TradingView 跳转链接

## 4. 市场 Tab 图表区域

- [ ] 4.1 在 `src/app/market/page.tsx` 下方新增 Tab 图表区域，5 个 Tab：A股、美股、港股、日股、波动率
- [ ] 4.2 每个 Tab 配置默认 symbol 和可切换指数列表，Tab 内提供指数切换按钮
- [ ] 4.3 波动率 Tab 特殊处理：图表下方保留 VixSentiment 情绪阈值参考组件，传入当前 VIX 值

## 5. 页面布局整合与清理

- [ ] 5.1 移除旧的 VIX 独立大字展示区域，VIX 数据行保留在表格波动分组中
- [ ] 5.2 整体布局调整：上方指数表格 + 下方 Tab 图表区域，响应式适配移动端
- [ ] 5.3 更新 `openspec/specs/market-overview/spec.md` 主 spec 同步变更内容
