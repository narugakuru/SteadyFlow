## Context

当前市场概览页通过裸 HTTP 请求调用 Yahoo Finance 非官方 API（`query1.finance.yahoo.com/v7/finance/quote`），获取 12 个全球指数的实时行情。该 API 无认证机制，近年 Yahoo 加强了反爬（cookie/crumb 验证），导致请求频繁失败。失败时页面显示空白错误提示，完全不可用。

现有代码：
- `src/lib/market-data.ts`：裸请求 + INDEX_CONFIG 静态配置
- `src/app/market/page.tsx`：客户端组件，useFetch 获取数据后渲染表格
- `src/app/api/market/route.ts`：简单代理，调用 fetchMarketData()
- `src/components/vix-sentiment.tsx`：VIX 情绪阈值参考组件（保留不动）

技术栈：Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui

## Goals / Non-Goals

**Goals:**
- 页面永不空白：即使所有 API 失败，也显示完整的指数表格骨架和 TradingView 链接
- 提升数据获取稳定性：使用 yahoo-finance2 替代裸请求
- 新增图表区域：TradingView Advanced Chart Widget 嵌入，按市场分 tab
- 保持页面轻量，无需后端数据库存储市场数据

**Non-Goals:**
- 不实现 Google Sheets 数据源（预留扩展空间）
- 不实现历史 K 线数据存储
- 不实现 TradingView Ticker Tape 滚动条（旧 spec 中的计划，本次不做）
- 不实现 Mini Chart 网格（旧 spec 中的计划，用 Advanced Chart 替代）

## Decisions

### D1: 数据获取层使用 yahoo-finance2

**选择**: 使用 `yahoo-finance2` npm 包替代裸 HTTP 请求

**理由**: yahoo-finance2 是社区维护最活跃的 Yahoo Finance wrapper，自动处理 cookie/crumb 认证流程，有错误重试机制。底层数据源相同，但封装层显著提升稳定性。

**替代方案**:
- Alpha Vantage API：免费额度仅 25 次/天，不够用
- Twelve Data：免费 800 次/天但只支持 8 个 symbol
- Google Sheets GOOGLEFINANCE：刷新时机不可控，延迟不确定
- 东方财富/新浪财经：无 CORS，需要额外代理

### D2: 表格静态骨架 + 动态填充

**选择**: INDEX_CONFIG 作为静态数据源驱动表格渲染，API 数据仅填充价格列

**理由**: 表格结构（指数名称、TradingView 链接）不依赖 API。API 失败时价格显示 `--`，页面保持完整可用。用户仍可通过链接跳转 TradingView 查看行情。

**实现**: 前端直接从 INDEX_CONFIG 生成表格行，API 返回的价格数据通过 symbol 匹配填充。loading 状态显示骨架屏而非空白。

### D3: TradingView Advanced Chart Widget 嵌入

**选择**: 使用 TradingView 免费 Advanced Chart Widget（iframe 嵌入），不使用 Mini Chart

**理由**: Advanced Chart 支持的 symbol 范围更广，交互更丰富（缩放、时间范围、指标叠加），且免费版即可使用。Mini Chart 功能有限且部分 A 股指数不支持。

**实现**: 创建 `TradingViewChart` React 组件，通过 TradingView widget JS API 初始化。每个市场 tab 配置默认 symbol，widget 内支持切换同市场其他指数。

### D4: 按市场分 Tab 布局

**选择**: 5 个 tab — A股、美股、港股、日股、波动率

**理由**: 与表格分组一致，用户心智模型统一。每个 tab 加载对应市场的 TradingView chart，默认显示该市场最重要的指数。

**Tab 配置**:
| Tab | 默认 Symbol | 可切换 |
|-----|------------|--------|
| A股 | SSE:000001 | SSE:000300, SZSE:399006, SSE:000905 |
| 美股 | FOREXCOM:SPXUSD | NASDAQ:NDX, DJ:DJI |
| 港股 | HSI:HSI | TVC:HSTECH |
| 日股 | TVC:NI225 | TSE:TOPIX |
| 波动率 | CBOE:VIX | — |

### D5: VIX 区域调整

**选择**: VIX 数据行保留在表格中（波动分组），VIX 情绪阈值参考组件保留在波动率 tab 图表下方

**理由**: VIX 情绪参考是有价值的功能，但不需要独占页面空间。放在波动率 tab 内更合理。

## Risks / Trade-offs

- [yahoo-finance2 仍依赖非官方 API] → 比裸请求稳定但无 SLA 保障。静态骨架兜底确保页面不空白。未来可加 Google Sheets fallback。
- [TradingView Widget 部分 A 股 symbol 可能不支持] → 沪深300（SSE:000300）和中证500（SSE:000905）需实际测试。不支持的 symbol 显示提示 + TradingView 跳转链接兜底。
- [TradingView Widget 有品牌水印] → 免费版限制，个人工具可接受。
- [新增 yahoo-finance2 依赖增加包体积] → 仅在服务端 API route 使用，不影响客户端 bundle。
