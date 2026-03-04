## ADDED Requirements

### Requirement: 交易弹窗类型切换保持已选上下文

系统 SHALL 在交易弹窗中切换 `buy`、`sell`、`dividend` 时保持当前已选账户与持仓，不得因类型切换自动清空。

#### Scenario: 从持仓快捷入口切换类型

- **WHEN** 用户在账户页或纪律表通过某持仓打开交易弹窗，默认已预填账户 A 与持仓 A，并将类型从买入切换为卖出或股息
- **THEN** 表单仍保持账户 A 与持仓 A，不要求用户重新选择

#### Scenario: 账户切换仍清空持仓

- **WHEN** 用户手动将账户从 A 切换到 B
- **THEN** 系统清空持仓选择并要求重新选择 B 账户下的持仓

### Requirement: 买卖交易自动填充持仓价格

系统 SHALL 在买入/卖出交易中，当用户选择 shares 模式持仓后自动填充该持仓记录价格（`holding.price`）到成交价输入框。自动填充值 SHALL 可由用户手动修改。

#### Scenario: 打开弹窗后自动带出价格

- **WHEN** 用户从 shares 模式持仓打开交易弹窗，且该持仓价格为 `15.23`
- **THEN** 买入/卖出成交价输入框默认显示 `15.23`

#### Scenario: 切换持仓时更新默认价格

- **WHEN** 用户在买入/卖出交易中将持仓从 A 切换到 B，且 B 持仓价格为 `7.8`
- **THEN** 成交价输入框自动更新为 `7.8`

## MODIFIED Requirements

### Requirement: 卖出交易了结盈亏计算

系统 SHALL 在创建交易时为卖出与股息交易计算并存储 `realizedPnl`。卖出交易仅当 `type=sell` 且 `affectHolding=true` 时参与计算；股息交易仅当 `type=dividend` 且 `affectCash=true` 时参与计算，且 `realizedPnl = amount - fee`。手续费 MUST 计入该笔了结盈亏；其余交易 `realizedPnl` MUST 为 `0`。

#### Scenario: affectHolding=true 的卖出计入了结盈亏

- **WHEN** 用户创建一笔卖出交易，`type=sell` 且 `affectHolding=true`
- **THEN** 系统计算并存储该笔交易 `realizedPnl`，并将手续费计入净收益

#### Scenario: affectHolding=false 的卖出不计入了结盈亏

- **WHEN** 用户创建一笔卖出交易，`type=sell` 且 `affectHolding=false`
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `0`

#### Scenario: affectCash=true 的股息计入了结盈亏

- **WHEN** 用户创建一笔股息交易，`type=dividend`、`amount=1000`、`fee=10`，且 `affectCash=true`
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `990`

#### Scenario: affectCash=false 的股息不计入了结盈亏

- **WHEN** 用户创建一笔股息交易，`type=dividend` 且 `affectCash=false`
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `0`
