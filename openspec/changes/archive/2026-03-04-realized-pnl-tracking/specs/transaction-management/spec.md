## ADDED Requirements

### Requirement: 卖出交易了结盈亏计算

系统 SHALL 在创建交易时为卖出交易计算并存储 `realizedPnl`。仅当 `type=sell` 且 `affectHolding=true` 时参与计算；手续费 MUST 计入该笔了结盈亏；其余交易 `realizedPnl` MUST 为 `0`。

#### Scenario: affectHolding=true 的卖出计入了结盈亏

- **WHEN** 用户创建一笔卖出交易，`type=sell` 且 `affectHolding=true`
- **THEN** 系统计算并存储该笔交易 `realizedPnl`，并将手续费计入净收益

#### Scenario: affectHolding=false 的卖出不计入了结盈亏

- **WHEN** 用户创建一笔卖出交易，`type=sell` 且 `affectHolding=false`
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `0`

### Requirement: 交易创建与删除使用事务

系统 MUST 对交易创建与删除使用数据库事务，保证交易记录、持仓/现金副作用（如开启）与账户累计了结盈亏更新的一致性。

#### Scenario: 创建交易时部分步骤失败

- **WHEN** 创建交易过程中任一子步骤失败
- **THEN** 系统回滚事务，不保留部分成功结果

#### Scenario: 删除交易时部分步骤失败

- **WHEN** 删除交易过程中任一子步骤失败
- **THEN** 系统回滚事务，交易记录与账户累计保持删除前状态

## MODIFIED Requirements

### Requirement: 删除交易记录

系统 SHALL 允许已登录用户删除自己的交易记录。删除交易 MUST NOT 回滚对持仓或账户现金余额的修改。删除交易 MUST 对账户累计了结盈亏做对称回退（按被删除交易的 `realizedPnl` 增量扣减）。MUST 验证交易所属账户属于当前用户。

#### Scenario: 删除交易不回滚持仓与现金

- **WHEN** 用户删除一笔买入交易记录
- **THEN** 系统删除该交易记录，holding 和 account 的 cost/marketValue/shares/cashBalance 等字段保持不变

#### Scenario: 删除计入了结盈亏的卖出交易

- **WHEN** 用户删除一笔 `realizedPnl=+500` 且 `affectHolding=true` 的卖出交易
- **THEN** 系统删除该交易记录，并将所属账户累计 `realizedPnl` 减少 `500`

#### Scenario: 删除不计入了结盈亏的卖出交易

- **WHEN** 用户删除一笔 `affectHolding=false` 的卖出交易
- **THEN** 系统删除该交易记录，所属账户累计 `realizedPnl` 保持不变

#### Scenario: 不能删除他人交易

- **WHEN** 用户尝试删除不属于自己账户的交易记录
- **THEN** 系统返回 404
