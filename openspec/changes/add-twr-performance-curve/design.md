# Design: TWR 收益率曲线

## 背景与约束

- **市值来源**：`netvalue` 表每日一条 `(userId, date, totalAssetCny)`，由用户访问或每日 Cron 写入。这是逐日组合市值 `V_t` 的唯一来源，已折算为 CNY。
- **现金流来源**：`transactions` 表的 `type IN ('deposit','withdraw')`，`amount` 为账户原币种。需按 `date` 聚合并折算 CNY。
- **不抓历史行情**：因此无法反推系统上线前的市值，曲线只能从最早一条净值快照起算。
- **类现金资产**：银行/支付宝余额等已包含在每日 `totalAssetCny` 中，无需特殊处理。

## 核心算法：时间加权收益率（TWR）

逐日链式累乘，采用 Modified Dietz 简化形式（与 Wealthfolio `compute_time_weighted_returns` 一致）：

```
单日收益率   r_t = (V_t - V_{t-1} - F_t) / V_{t-1}
累计收益率   TWR_t = ∏_{i<=t}(1 + r_i) - 1
```

其中：

- `V_t` = 第 t 天净值快照的 `totalAssetCny`
- `V_{t-1}` = 上一个有快照的日期的市值（**按快照实际存在的日期取前一个点，不假设每个自然日都有快照**）
- `F_t` = 第 t 天的外部净现金流（CNY），`F_t = Σ deposit(t) - Σ withdraw(t)`，折算 CNY

分母用 `V_{t-1}`（期初市值）而非 `V_{t-1} + F_t`，因为我们无法确定现金流发生在当日内的具体时点；对个人低频现金流，期初分母足够准确，且实现简单、可解释。

### 年化 TWR

```
annualized_TWR = (1 + TWR_total)^(365 / days) - 1
```

`days` 为起算日到最后一个点的自然日跨度；`days < 365` 时年化意义不大，前端 SHOULD 标注或仅在区间 >= 1 年时展示年化值。

## 现金流对齐

净值快照不保证每个自然日都有（用户可能几天才打开一次，Cron 每天写一条但用户也可能手工触发）。对齐规则：

1. 取该用户在 `[startDate, endDate]` 内全部净值快照，按日期升序，得到市值点序列 `[(d_0, V_0), (d_1, V_1), ...]`。
2. 对每个相邻区间 `(d_{k-1}, d_k]`，聚合该区间内**所有日期**的 `deposit/withdraw` 得到 `F_k`（即把区间内的现金流归并到区间右端点 `d_k`）。
3. 用上面的公式按市值点序列链式计算，第一个点 `d_0` 作为基准，`TWR_{d_0}=0`。

这样即使快照稀疏，现金流也不会丢失或重复计入。

## 业绩起算日（performance.start_date）

- 默认 = 该用户最早一条净值快照的日期。
- 用户可在设置中指定更晚的日期，用于跳过早期建仓波动或数据不完整段。
- 计算时 `startDate = max(用户设置, 最早快照日)`，并以该日市值为基准点（TWR=0）。

## "台阶式跳变"问题与对策

风险场景：用户**中途新建账户并填入初始金额**，或**中途新增持仓且背后是新转入的钱**，会导致 `totalAssetCny` 出现非市场原因的台阶跳变，被误算为巨额收益。

对策（本期）：

- 文档化要求——用户中途注入/抽离资金时，应补录对应的 `deposit/withdraw` 交易，则该跳变被 `F_t` 正确剔除。
- 用户当前现金流"异常简单、可立即补全"，因此本期依赖补录而非自动探测。

非目标（后续可选）：自动探测无对应现金流的异常单日跳变并提示用户补录。

## 现金流折算 CNY

- `deposit/withdraw` 的 `amount` 为账户原币种。需 join `accounts.currency` 后用 `convertToCNY` 折算。
- **使用当前汇率**折算历史现金流（系统未存历史汇率）。对个人工具可接受；仅外币现金流那几笔存在汇率近似误差。复用 `lib/data-source/exchange-rate.ts` 的 `getExchangeRates` + `convertToCNY`。

## 端点设计

`GET /api/netvalue/performance?range=<1m|3m|6m|1y|ytd|all>&grain=<day|week|month>`

响应：

```jsonc
{
  "startDate": "2025-01-02",
  "series": [
    { "date": "2025-01-02", "cumulativeTwr": 0, "value": 500000 },
    { "date": "2025-01-09", "cumulativeTwr": 0.0123, "value": 510500 },
    // ...
  ],
  "summary": {
    "cumulativeTwr": 0.18,
    "annualizedTwr": 0.165, // 区间 < 1 年时可为 null
    "days": 158,
  },
}
```

- 复用 `netvalue-history-service` 的 range/grain 采样逻辑选取市值点，再叠加现金流计算 TWR。
- 实时聚合：每次请求重新读取净值序列 + 现金流并计算，因此补录历史现金流后曲线立即反映最新结果。

## 前端

- 总览页/净值页提供"净值 / 收益率"切换。
- 收益率视图：折线图，Y 轴为百分比，**渲染 0% 基准线**（与资产面积图明确区分——资产图 MUST NOT 画收益 0 线，见 visualization-charts spec）。
- Tooltip 显示日期、累计 TWR%、当日组合市值。
- 摘要区显示区间累计 TWR 与年化 TWR（年化在区间 >= 1 年时展示）。

## 缓存

- 新增查询键 `netvalue-performance`，策略同 `netvalue-chart`（`LONG_HISTORY_POLICY`，staleTime=1h）。
- 写操作失效映射：`transactions-write`、`accounts-write`、`holdings-write`、`batch-update-write`、`fetch-prices-write`、`settings-write`（影响起算日）均追加失效 `netvalue-performance`。

## 为什么不选其他方案

- **方案 A（快照纯链式、忽略现金流）**：仅在零现金流时正确；用户将补录现金流，故必须支持 `F_t`。
- **方案 C（Wealthfolio 式历史行情反推 + 全量重算）**：需抓 A股/港股历史行情（难且不稳定），对类现金资产失效，工作量数周且需长期维护行情库。本系统已有每日快照，无需反推，性价比低。
- **新增 `netContributionCny` 列预存**：本期现金流低频、数据量小，实时聚合性能足够，避免 schema 迁移与回填；若未来交易量增大可作为后续优化。
