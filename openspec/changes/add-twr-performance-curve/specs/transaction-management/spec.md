## ADDED Requirements

### Requirement: deposit/withdraw 作为收益率外部现金流来源

系统 SHALL 将 `deposit`（流入）与 `withdraw`（流出）交易定义为收益率（TWR）计算的外部现金流来源。其余交易类型（`buy/sell/dividend/fee/interest`）MUST 被视为内部流，不参与收益率的现金流剔除。用户补录或修改此类现金流后，收益率链路 MUST 在后续计算中自动反映。

#### Scenario: 入金计为正向外部现金流

- **WHEN** 用户创建一笔 `deposit` 交易
- **THEN** 该金额（折算 CNY 后）计为对应区间的正向外部现金流，参与 TWR 剔除

#### Scenario: 出金计为负向外部现金流

- **WHEN** 用户创建一笔 `withdraw` 交易
- **THEN** 该金额（折算 CNY 后）计为对应区间的负向外部现金流，参与 TWR 剔除

#### Scenario: 内部交易不影响现金流剔除

- **WHEN** 用户创建 `buy/sell/dividend/fee` 等交易
- **THEN** 这些交易不计入外部现金流，其价值影响由净值快照自然吸收
