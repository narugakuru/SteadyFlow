## MODIFIED Requirements

### Requirement: 创建交易记录

系统 SHALL 允许已登录用户为自己的账户创建交易记录，交易类型包括：买入(buy)、卖出(sell)、股息(dividend)、现金存入(deposit)、现金取出(withdraw)。创建交易前 MUST 验证目标账户属于当前用户。交易记录 SHALL 存储 `affectCash` 和 `affectHolding` 两个独立字段。API SHALL 同时支持旧参数 `affectBalance`（等价于同时设置两个新字段）以保持兼容。

shares 模式买入副作用（affectHolding=true）：

- cost 按加权平均法重算：`newCost = (oldCost × oldShares + txPrice × txShares) / (oldShares + txShares)`
- shares += txShares
- price = txPrice（更新为成交价）
- marketValue = newShares × newPrice

shares 模式卖出副作用（affectHolding=true）：

- cost 不变
- shares -= txShares
- price = txPrice（更新为成交价）
- marketValue = newShares × newPrice

amount 模式买入副作用（affectHolding=true）：

- cost += amount
- marketValue += amount

amount 模式卖出副作用（affectHolding=true）：

- costReduce = amount × cost / marketValue（按比例扣减）
- cost -= costReduce
- marketValue -= amount

#### Scenario: shares 模式买入（加权平均成本）

- **WHEN** 已登录用户对 shares 模式持仓（cost=10, shares=100）创建买入交易，txShares=50, txPrice=12, affectHolding=true
- **THEN** newCost = (10×100 + 12×50) / 150 = 10.67, shares=150, price=12, marketValue=150×12=1800

#### Scenario: shares 模式首次买入

- **WHEN** 已登录用户对 shares 模式持仓（cost=0, shares=0）创建买入交易，txShares=100, txPrice=15, affectHolding=true
- **THEN** cost=15（成交价即初始成本价）, shares=100, price=15, marketValue=100×15=1500

#### Scenario: shares 模式卖出（成本不变）

- **WHEN** 已登录用户对 shares 模式持仓（cost=10.67, shares=150）创建卖出交易，txShares=50, txPrice=15, affectHolding=true
- **THEN** cost=10.67（不变）, shares=100, price=15, marketValue=100×15=1500

#### Scenario: 创建买入交易（amount模式）

- **WHEN** 已登录用户为自己账户中 amount 模式的持仓"余额宝"创建买入交易，金额 5000，手续费 0，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，holding.cost += 5000，holding.marketValue += 5000，account.cashBalance -= 5000

#### Scenario: 不能为他人账户创建交易

- **WHEN** 用户尝试为不属于自己的账户创建交易
- **THEN** 系统返回 404
