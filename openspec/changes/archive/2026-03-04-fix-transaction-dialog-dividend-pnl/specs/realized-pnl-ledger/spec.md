## MODIFIED Requirements

### Requirement: 了结盈亏双层存储

系统 SHALL 在交易层与账户层同时存储了结盈亏，且金额单位为账户原币种。`transactions` MUST 存储 `realizedPnl` 字段（默认 `0`），`accounts` MUST 存储累计字段 `realizedPnl`（默认 `0`）。

#### Scenario: 非卖出且非股息的新交易默认值

- **WHEN** 系统创建任意非卖出且非股息交易
- **THEN** 该交易的 `realizedPnl` 存储为 `0`

#### Scenario: affectHolding=false 的卖出交易默认值

- **WHEN** 系统创建一笔 `type=sell` 且 `affectHolding=false` 的交易
- **THEN** 该交易的 `realizedPnl` 存储为 `0`

#### Scenario: affectCash=false 的股息交易默认值

- **WHEN** 系统创建一笔 `type=dividend` 且 `affectCash=false` 的交易
- **THEN** 该交易的 `realizedPnl` 存储为 `0`

#### Scenario: affectCash=true 的股息交易存储值

- **WHEN** 系统创建一笔 `type=dividend`、`amount=500`、`fee=5` 且 `affectCash=true` 的交易
- **THEN** 该交易的 `realizedPnl` 存储为 `495`

#### Scenario: 账户累计默认值

- **WHEN** 系统创建新账户
- **THEN** 账户累计 `realizedPnl` 初始化为 `0`

### Requirement: 了结盈亏增量维护

系统 MUST 在交易写路径增量维护账户累计了结盈亏，避免读取时全量扫描交易记录。新增交易时按该笔交易的 `realizedPnl` 增加账户累计；删除交易时按该笔交易的 `realizedPnl` 减少账户累计。

#### Scenario: 新增卖出交易增加累计值

- **WHEN** 用户新增一笔 `realizedPnl=+1200` 的卖出交易
- **THEN** 目标账户累计 `realizedPnl` 增加 `1200`

#### Scenario: 新增股息交易增加累计值

- **WHEN** 用户新增一笔 `realizedPnl=+300` 的股息交易
- **THEN** 目标账户累计 `realizedPnl` 增加 `300`

#### Scenario: 删除卖出交易减少累计值

- **WHEN** 用户删除一笔 `realizedPnl=-300` 的卖出交易
- **THEN** 目标账户累计 `realizedPnl` 减少 `-300`（等价于增加 `300`）

#### Scenario: 删除股息交易减少累计值

- **WHEN** 用户删除一笔 `realizedPnl=+300` 的股息交易
- **THEN** 目标账户累计 `realizedPnl` 减少 `300`
