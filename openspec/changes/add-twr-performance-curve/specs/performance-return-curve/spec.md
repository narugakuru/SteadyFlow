## ADDED Requirements

### Requirement: 时间加权收益率（TWR）计算

系统 SHALL 基于每日净值快照的逐日组合市值与交易现金流，计算时间加权收益率（TWR）。单日收益率 MUST 按 `r_t = (V_t - V_{t-1} - F_t) / V_{t-1}` 计算，其中 `V_t` 为当前市值点的总资产（CNY），`V_{t-1}` 为按快照实际存在日期取得的上一市值点，`F_t` 为归并到该区间右端点的外部净现金流（CNY）。累计 TWR MUST 为相邻单日收益率因子的连乘减一（`∏(1+r_t)-1`）。系统 MUST NOT 抓取或反推历史行情来生成市值序列。

#### Scenario: 无现金流时收益率等于市值变化率

- **WHEN** 区间内不存在任何 `deposit/withdraw` 现金流
- **THEN** 单日收益率退化为 `(V_t - V_{t-1}) / V_{t-1}`，累计 TWR 反映纯市场涨跌

#### Scenario: 转入资金被剔除不计入收益

- **WHEN** 某市值点区间内存在一笔 `deposit`（净流入 `F_t > 0`）
- **THEN** 该笔流入从单日收益率分子中扣除，不被误算为投资收益

#### Scenario: 转出资金不被误算为亏损

- **WHEN** 某市值点区间内存在一笔 `withdraw`（净流出，`F_t < 0`）
- **THEN** 该笔流出在分子中以 `- F_t` 形式抵消，不被误算为投资亏损

#### Scenario: 稀疏快照不丢失现金流

- **WHEN** 净值快照不连续（相邻市值点之间相隔多日），且这些日期内存在现金流
- **THEN** 区间内所有现金流被聚合并归并到该区间右端点，既不丢失也不重复计入

### Requirement: 外部现金流分类与折算

系统 SHALL 仅将交易类型 `deposit`（流入，正向）与 `withdraw`（流出，负向）视为收益率计算的外部现金流；`buy/sell/dividend/fee/interest` 等 MUST 视为内部流，不参与现金流剔除（其影响由市值快照自然吸收）。现金流金额为账户原币种时 MUST 折算为 CNY 后参与计算。

#### Scenario: 买卖不计入外部现金流

- **WHEN** 区间内存在 `buy` 或 `sell` 交易
- **THEN** 该交易不计入 `F_t`，其对组合价值的影响由市值快照体现

#### Scenario: 外币现金流折算 CNY

- **WHEN** 某 `deposit` 交易为外币账户（如 USD）
- **THEN** 系统按账户币种使用当前汇率折算为 CNY 后计入 `F_t`

### Requirement: 业绩起算日

系统 SHALL 支持业绩起算日 `performance.start_date` 用户设置，并以该日的市值点为基准（累计 TWR 为 0）。系统在用户未设置或设置非法时 MUST 默认使用该用户最早一条净值快照日期；实际起算日 MUST 取 `max(用户设置, 最早净值快照日)`。

#### Scenario: 默认起算日为最早快照

- **WHEN** 用户未设置 `performance.start_date`
- **THEN** 系统以该用户最早一条净值快照日期作为起算日，且该日累计 TWR 为 0

#### Scenario: 用户指定更晚起算日

- **WHEN** 用户设置 `performance.start_date` 晚于最早快照日
- **THEN** 系统从该指定日期起算，早于该日的快照不参与收益率计算

#### Scenario: 起算日早于最早快照被纠正

- **WHEN** 用户设置的起算日早于最早净值快照日
- **THEN** 系统以最早净值快照日作为实际起算日

### Requirement: 收益率业绩端点

系统 SHALL 提供 `GET /api/netvalue/performance` 端点，按当前登录用户返回累计 TWR 序列与区间业绩摘要，支持 `range` 与 `grain` 参数。响应 MUST 包含起算日、序列（每点含日期、累计 TWR、当日组合市值）与摘要（累计 TWR、年化 TWR、天数）。年化 TWR 在区间不足一年时 MAY 为 null。

#### Scenario: 返回累计 TWR 序列

- **WHEN** 已登录用户请求 `GET /api/netvalue/performance` 且存在至少两个市值点
- **THEN** 系统返回累计 TWR 序列与摘要，起算日点的累计 TWR 为 0

#### Scenario: 区间不足一年不强制年化

- **WHEN** 请求区间跨度小于一年
- **THEN** 摘要中的累计 TWR 正常返回，年化 TWR 可为 null

#### Scenario: 数据不足返回安全空序列

- **WHEN** 该用户净值快照少于两个点
- **THEN** 系统返回安全的空或单点序列，不产生 NaN 或 Infinity

#### Scenario: 未登录访问被拒绝

- **WHEN** 未登录用户请求 `GET /api/netvalue/performance`
- **THEN** 系统返回 401

### Requirement: 补录现金流后自动重算

系统 SHALL 采用实时聚合方式计算收益率：每次请求即时读取净值序列与交易现金流并计算。用户补录或修改历史 `deposit/withdraw` 后，后续请求 MUST 反映更新后的收益率链路，无需独立重算任务。

#### Scenario: 补录历史入金后曲线更新

- **WHEN** 用户为某历史日期补录一笔 `deposit` 交易并重新请求业绩端点
- **THEN** 该日所在区间的单日收益率剔除该笔流入，整条累计 TWR 曲线随之更新
