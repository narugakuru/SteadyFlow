## Context

当前应用有 5 个页面（总览/账户/交易/快照/股价更新），全部围绕用户自己的投资组合。缺少外部市场环境感知。用户希望在同一应用内查看全球主要指数和市场情绪指标。

应用为本地部署的 Next.js 16 应用，无公网服务器，因此市场数据需要通过客户端直接获取。TradingView 提供免费嵌入式 Widget，通过 script 标签加载，无需 API key，适合此场景。

## Goals / Non-Goals

**Goals:**
- 新增市场概览页，展示全球主要指数实时行情
- 通过 VIX 情绪指标帮助用户感知市场温度
- 零后端成本，纯前端嵌入实现

**Non-Goals:**
- 不做自建行情数据服务或后端缓存
- 不做个股搜索或自定义标的添加（本期）
- 不做市场数据与持仓的联动分析（后续可扩展）
- VIX 阈值提示为静态参考区域，不做实时数值读取（TradingView Widget 不提供数据回调）

## Decisions

### 1. 使用 TradingView 免费嵌入式 Widget

**选择**: TradingView Widget（Ticker Tape + Mini Chart + Advanced Chart）
**替代方案**: 自建 API 调用 Yahoo Finance → 需要后端、缓存、定时任务，复杂度高
**理由**: 零维护成本，数据实时，自带图表交互，与本地部署架构匹配

### 2. Widget 组合方案

| 区域 | Widget 类型 | 用途 |
|------|------------|------|
| 顶部 | Ticker Tape | 滚动展示所有指数实时价格 |
| 中部 | Mini Symbol Overview | 每个市场一个卡片，含迷你图表 |
| 底部 | Advanced Chart | VIX 完整 K 线图 |

### 3. VIX 情绪提示为静态参考

**选择**: 基于固定阈值的静态展示区域（表情 + 文字 + 颜色）
**理由**: TradingView Widget 运行在 iframe 中，无法通过 JS 回调获取实时数值。静态参考区域让用户对照 VIX 图表自行判断当前情绪级别，实用且简单。

### 4. TradingView Widget 嵌入方式

**选择**: 使用 React 组件封装，通过 useEffect + useRef 动态创建 script 标签
**理由**: Next.js App Router 使用 "use client" 组件，需要在客户端挂载后加载 TradingView 脚本。封装为独立组件便于复用和管理生命周期。

### 5. 指数标的的 TradingView Symbol 映射

| 市场 | 指数 | TradingView Symbol |
|------|------|--------------------|
| 美股 | S&P 500 | FOREXCOM:SPXUSD 或 SP:SPX |
| 美股 | 纳斯达克100 | NASDAQ:NDX |
| 美股 | 道琼斯 | DJ:DJI |
| A股 | 沪深300 | SSE:000300 |
| A股 | 上证指数 | SSE:000001 |
| A股 | 创业板指 | SZSE:399006 |
| A股 | 中证500 | SSE:000905 |
| 港股 | 恒生指数 | HSI:HSI |
| 港股 | 恒生科技 | TVC:HSTECH |
| 日股 | 日经225 | TVC:NI225 |
| 日股 | 东证指数 | TSE:TOPIX |
| 波动 | VIX | CBOE:VIX |

注：具体 symbol 前缀需在实现时验证，TradingView 可能有多个数据源提供同一指数。

## Risks / Trade-offs

- [TradingView Widget 加载依赖外网] → 本地网络需能访问 TradingView CDN；中国大陆可能需要代理
- [Widget iframe 样式不完全可控] → 通过 Widget 配置参数（theme、colorTheme）尽量匹配应用风格
- [A股指数 symbol 可能不准确] → 实现时逐一验证，必要时调整 symbol 前缀
- [页面加载多个 Widget 可能较慢] → Mini Chart 使用轻量配置，避免加载过多功能
