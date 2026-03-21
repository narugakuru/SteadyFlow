## Context

当前市场页由 `src/app/market/page.tsx` 直接消费 `/api/market` 返回的 `MarketIndex[]`，页面上半部是分组指数表格，下半部是按市场切换的 TradingView Advanced Chart Widget。数据聚合在 `src/lib/data-source/market-data.ts` 中完成，现状依赖 `Stooq + Yahoo`，其中 A 股可用，但美股、港股、日股和波动率已出现持续缺失。

这次变更同时涉及页面结构、前端图表组件、市场 API 合同和数据源映射，属于跨组件与跨数据适配层的调整。现有依赖已经包含 `recharts`，可以满足自绘免费图表需求，无需再为市场页引入额外付费或外部嵌入式方案。

## Goals / Non-Goals

**Goals:**

- 用免费、内建的图表方案替换页面内嵌 TradingView 图表。
- 统一市场页数据源为 `Stooq + Tencent`，解决非 A 股市场的高频缺失问题。
- 把 VIX 变为市场页首屏重点内容，提供历史走势和简化后的区间说明。
- 在同一接口中补充 ATH 日期与当前回撤摘要，支持页面直接渲染决策信息。

**Non-Goals:**

- 不在本次变更中删除 `src/components/tradingview-chart.tsx` 文件，只解除市场页引用。
- 不引入数据库持久化或后台定时任务缓存市场页数据。
- 不开放用户自定义市场跟踪清单，本次只交付固定配置的指数和资产列表。

## Decisions

### 1. 用 `recharts` 实现 VIX 顶部图表，替代 TradingView 嵌入

市场页顶部新增独立的 VIX 卡片，图表使用现有 `recharts` 组件渲染日线走势，数据由服务端返回标准化时间序列。这样可以彻底移除付费依赖和第三方脚本注入，同时保持与现有项目图表风格一致。

选择 `recharts` 的原因：

- 依赖已存在，避免增加新包和新的 SSR/客户端兼容问题。
- 当前页面只需要单序列 VIX 走势，不需要 TradingView 那类高级交互。
- 自绘方案可以直接绑定自定义说明文案和加载/错误状态。

备选方案：

- `lightweight-charts`：功能更强，但需要新增依赖和更多封装，不是这次需求必须。
- 保留 TradingView 免费版：仍受嵌入能力与商业限制约束，不满足“去掉 TradingView 图表”的目标。

### 2. 将 `/api/market` 扩展为复合响应，而不是拆成多个请求

API 改为一次返回市场页所需的全部数据，例如：

```ts
{
  indices: MarketIndexSnapshot[],
  vix: {
    latest: number | null,
    latestAt: string | null,
    series: { date: string; close: number }[]
  },
  athDrawdowns: MarketAthDrawdown[],
  updatedAt: string
}
```

这样做的原因：

- 市场页已有统一刷新按钮和 Query Cache，单接口更容易保持更新时间一致。
- VIX 图表、指数表格、ATH 列表属于同一屏内容，拆成多请求会带来多套 loading/error 状态。
- 后续如果需要增加更多市场摘要信息，也可以继续在同一聚合接口上扩展。

备选方案：

- 多个独立 API：实现简单，但前端状态更碎，且不利于统一刷新。

### 3. 采用“快照”和“历史”分离的数据适配模型

市场页数据不再假设所有标的都能通过同一种接口拿到“实时快照 + 历史序列”。实现上拆成两类 provider：

- `snapshotProvider`：获取指数表格的最新价、涨跌、涨跌幅。
- `historyProvider`：获取 VIX 图表与 ATH 计算所需的日线序列。

推荐映射：

- Tencent 快照：A 股、港股及其核心指数。
- Stooq 快照：美股、日股和可直接稳定返回的全球指数。
- Stooq 历史：VIX、DAX、道琼斯、纳指、标普、日经等需要回溯历史高点的标的。

这样设计的原因是，`Stooq` 对 VIX 当前 CSV 可能返回 `N/D`，但历史序列更适合作为 VIX 图表和“最新可用收盘值”的来源；而 Tencent 适合补足中国和港股市场的指数快照。页面消费的是统一规范化后的结果，不直接感知底层源差异。

备选方案：

- 延续 `Stooq + Yahoo`：已被现状证明覆盖不稳定。
- 所有数据都走 Tencent：全球指数与历史高点覆盖不足，且符号体系更不统一。

### 4. VIX 说明改为单态说明卡，而不是 5 张并排卡片

`src/components/vix-sentiment.tsx` 改为根据最新 VIX 数值计算当前所处区间，仅展示当前区间的名称、范围和简短说明，同时保留完整阈值口径。页面不再一次性渲染全部 5 个区间卡片，以减少视觉噪音，让顶部区域聚焦在“当前市场状态”。

备选方案：

- 保留 5 档卡片并高亮当前值：信息完整，但视觉层级过重，不符合用户希望“更加简洁”的要求。

### 5. ATH 回撤列表由服务端聚合并输出固定展示字段

新增 `market-ath-drawdown` 配置表，逐项声明名称、展示顺序、快照源、历史源和符号。服务端根据历史序列计算：

- `lastAllTimeHighDate`
- `drawdownPercent`
- `statusEmoji`

前端只负责表格/列表渲染，不在客户端进行历史扫描。这样可以把符号差异、数据清洗和异常处理都收敛到 `lib/data-source` 层。对于 `FTSE All-World`、`MSCI World`、`Gold`、`Bitcoin` 这类可能需要代理符号或替代指数的标的，也通过配置显式标注。

备选方案：

- 前端直接请求第三方接口：暴露外部源细节，且重复计算历史高点，不利于缓存和测试。

## Risks / Trade-offs

- [免费数据源偶发超时或限流] → 保持“部分成功即可返回”的聚合策略，任何单项失败都只影响对应行或对应卡片。
- [某些全球资产缺少稳定的原生指数代码] → 使用显式符号注册表，并允许个别项在实现阶段采用可接受的替代代码或降级为 `--`。
- [API 响应体比当前更大] → 限制 VIX 序列窗口长度，ATH 列表保持固定数量，避免一次返回过长历史。
- [VIX 无稳定实时值] → 使用最新可用历史收盘值驱动说明与图表，文案上避免暗示“实时逐笔”。

## Migration Plan

1. 先扩展 `lib/data-source` 和 `/api/market`，让新接口能返回复合结构。
2. 再重构 `src/app/market/page.tsx`，切掉 TradingView 图表引用，接入顶部 VIX 区域与 ATH 列表。
3. 保留 `TradingViewChart` 组件文件但不再在市场页使用，降低回滚成本。
4. 如果上线后发现部分全球资产缺少稳定符号，优先回退该项为不可用展示，而不是回退整页结构。

## Open Questions

- `FTSE All-World`、`MSCI World`、`Gold`、`Bitcoin` 在实现阶段采用原生指数代码还是 ETF/现货代理代码，需要结合 `Stooq` 可用性最终确认。
- VIX 图表默认展示区间建议为近 1 年日线；如果用户更偏好短周期，再在实现阶段调整为 6 个月。
