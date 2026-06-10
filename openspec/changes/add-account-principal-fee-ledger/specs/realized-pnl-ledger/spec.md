## MODIFIED Requirements

### Requirement: 了结盈亏双层存储

系统 SHALL 在交易层与账户层同时存储了结盈亏，且金额单位为账户原币种。`transactions` MUST 存储 `realizedPnl` 字段（默认 `0`），`accounts` MUST 存储累计字段 `realizedPnl`（默认 `0`）。卖出、股息、买入手续费和费用扣除交易 SHALL 贡献 realizedPnl；费用扣除交易 MUST 以负数计入 realizedPnl。

#### Scenario: 非卖出、非股息、非费用且无手续费的新交易默认值

- **WHEN** 系统创建任意非卖出、非股息、非费用且手续费为 0 的交易
- **THEN** 该交易的 `realizedPnl` 存储为 `0`

#### Scenario: 买入手续费存储为负值

- **WHEN** 系统创建一笔 `type=buy`、`fee=5` 的交易
- **THEN** 该交易的 `realizedPnl` 存储为 `-5`

#### Scenario: 费用扣除交易存储为负值

- **WHEN** 系统创建一笔 `type=fee`、`amount=100` 的交易
- **THEN** 该交易的 `realizedPnl` 存储为 `-100`

#### Scenario: 账户累计默认值

- **WHEN** 系统创建新账户
- **THEN** 账户累计 `realizedPnl` 初始化为 `0`

### Requirement: 了结盈亏增量维护

系统 MUST 在交易写路径增量维护账户累计了结盈亏，避免读取时全量扫描交易记录。新增交易时按该笔交易的 `realizedPnl` 增加账户累计；删除交易时按该笔交易的 `realizedPnl` 减少账户累计。费用扣除和买入手续费 MUST 作为负的 realizedPnl 增量维护。

#### Scenario: 新增费用扣除交易减少累计值

- **WHEN** 用户新增一笔 `realizedPnl=-100` 的费用扣除交易
- **THEN** 目标账户累计 `realizedPnl` 减少 `100`

#### Scenario: 删除费用扣除交易增加累计值

- **WHEN** 用户删除一笔 `realizedPnl=-100` 的费用扣除交易
- **THEN** 目标账户累计 `realizedPnl` 增加 `100`

#### Scenario: 新增买入手续费减少累计值

- **WHEN** 用户新增一笔买入交易且该交易 `realizedPnl=-10`
- **THEN** 目标账户累计 `realizedPnl` 减少 `10`
