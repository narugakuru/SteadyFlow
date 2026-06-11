## Purpose

定义收益率业绩曲线能力的业务约束与验收标准。

## Requirements

### Requirement: 时间加权收益率（TWR）计算

系统 SHALL 基于每日净值快照的组合市值与交易现金流计算时间加权收益率（TWR）。单期收益率 MUST 按 `r_t = (V_t - V_{t-1} - F_t) / V_{t-1}` 计算，其中 `V_t` 为当前净值点的 `totalAssetCny`，`V_{t-1}` 为上一个实际存在的净值点，`F_t` 为归并到该区间右端点的外部净现金流（CNY）。累计 TWR MUST 为相邻收益率因子链式累乘减一（`∏(1+r_t)-1`）。

#### Scenario: 无现金流时收益率等于市值变化率

- **WHEN** 相邻净值点之间没有 `deposit/withdraw`
- **THEN** 单期收益率退化为 `(V_t - V_{t-1}) / V_{t-1}`

#### Scenario: 入金不计为收益

- **WHEN** 相邻净值点区间内存在 `deposit`
- **THEN** 系统将该现金流从收益率分子中扣除，不把资金流入误算为收益

#### Scenario: 出金不计为亏损

- **WHEN** 相邻净值点区间内存在 `withdraw`
- **THEN** 系统将该负向现金流纳入 `F_t`，不把资金流出误算为亏损

#### Scenario: 稀疏快照不丢失现金流

- **WHEN** 相邻净值点之间跨越多个自然日
- **THEN** 系统聚合 `(d_{k-1}, d_k]` 区间内全部外部现金流并归并到右端点

### Requirement: 外部现金流分类与折算

系统 SHALL 仅将 `deposit` 与 `withdraw` 交易定义为收益率计算的外部现金流来源。`buy/sell/dividend/fee/interest` 等交易 MUST 视为内部流，不参与现金流剔除。现金流金额为账户原币种时，系统 MUST join 账户币种并使用当前汇率折算为 CNY。

#### Scenario: 买卖不计入外部现金流

- **WHEN** 区间内存在 `buy` 或 `sell`
- **THEN** 该交易不计入 `F_t`

#### Scenario: 外币现金流折算

- **WHEN** USD 账户发生 `deposit`
- **THEN** 系统按当前 `USD/CNY` 汇率折算后计入外部现金流

### Requirement: 业绩起算日

系统 SHALL 支持用户设置 `performance.start_date` 作为收益率起算日。用户未设置、设置非法或设置早于最早净值快照时，系统 MUST 回退到该用户最早净值快照日期；实际计算起点还 MUST 尊重当前图表 range 的下限。

#### Scenario: 默认起算日

- **WHEN** 用户未设置 `performance.start_date`
- **THEN** 系统以最早可用净值快照作为默认起算边界

#### Scenario: 用户指定更晚起算日

- **WHEN** 用户设置了晚于最早快照的起算日
- **THEN** 早于该日期的净值点与现金流不参与收益率曲线计算

#### Scenario: 设置早于最早快照

- **WHEN** 用户设置的起算日早于最早快照
- **THEN** 系统使用最早快照日期作为实际起算边界

### Requirement: 收益率业绩端点

系统 SHALL 提供 `GET /api/netvalue/performance`，按当前登录用户返回收益率序列、摘要、起算日、range 与 grain。响应序列中的每个点 MUST 包含日期、累计 TWR 与当日组合市值；摘要 MUST 包含累计 TWR、年化 TWR 与天数。区间不足一年时年化 TWR MUST 返回 `null`。未登录访问 MUST 返回 401。

#### Scenario: 返回收益率序列

- **WHEN** 已登录用户请求收益率端点且至少存在两个净值点
- **THEN** 系统返回累计 TWR 序列，第一点累计 TWR 为 0

#### Scenario: 数据不足安全返回

- **WHEN** 用户净值点少于两个
- **THEN** 系统返回空或单点序列，不产生 NaN 或 Infinity

#### Scenario: 补录现金流后自动重算

- **WHEN** 用户补录或修改历史 `deposit/withdraw`
- **THEN** 后续请求即时基于最新净值与现金流重新计算收益率，无需后台重算任务
