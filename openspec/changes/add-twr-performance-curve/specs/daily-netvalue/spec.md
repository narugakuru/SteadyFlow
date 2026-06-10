## ADDED Requirements

### Requirement: 净值快照作为收益率市值序列来源

系统 SHALL 将每日净值快照的 `totalAssetCny` 作为收益率（TWR）计算的逐日组合市值序列来源。收益率计算 MUST NOT 依赖历史行情反推市值，且 MUST 容忍快照在自然日上不连续（稀疏）。

#### Scenario: 净值快照供给收益率计算

- **WHEN** 收益率业绩端点需要逐日市值
- **THEN** 系统使用净值快照的 `totalAssetCny` 作为市值点，而非抓取历史行情反推

#### Scenario: 类现金资产纳入市值序列

- **WHEN** 用户组合包含银行存款、支付宝余额等类现金资产
- **THEN** 这些资产价值已包含在 `totalAssetCny` 中，无需历史行情即可参与收益率计算
