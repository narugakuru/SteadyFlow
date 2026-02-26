## MODIFIED Requirements

### Requirement: 创建交易记录
系统 SHALL 允许用户创建交易记录，交易类型包括：买入(buy)、卖出(sell)、股息(dividend)、现金存入(deposit)、现金取出(withdraw)。交易记录 SHALL 存储 `affectCash` 和 `affectHolding` 两个独立字段。API SHALL 同时支持旧参数 `affectBalance`（等价于同时设置两个新字段）以保持兼容。

#### Scenario: 创建买入交易（amount模式）
- **WHEN** 用户为 amount 模式的持仓"余额宝"创建买入交易，金额 5000，手续费 0，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，holding.cost += 5000，holding.marketValue += 5000，account.cashBalance -= 5000

#### Scenario: 创建买入交易（shares模式）
- **WHEN** 用户为 shares 模式的持仓"沪深300ETF"创建买入交易，股数 1000，成交价 3.85，手续费 5，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，amount 自动计算为 3850，holding.cost += 3850，holding.shares += 1000，holding.price = 3.85，holding.marketValue = holding.shares × 3.85，account.cashBalance -= 3855

#### Scenario: 创建买入交易（shares模式，首次买入，持仓price为0）
- **WHEN** 用户为 shares 模式的新持仓"QQQM"（shares=0, price=0）创建买入交易，股数 5，成交价 247，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，amount = 1235，holding.cost = 1235，holding.shares = 5，holding.price = 247，holding.marketValue = 5 × 247 = 1235，account.cashBalance -= 1235

#### Scenario: 创建卖出交易（amount模式）
- **WHEN** 用户为 amount 模式的持仓（cost=5000, marketValue=6000）创建卖出交易，金额 3000，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，costReduce = 3000 × 5000 / 6000 = 2500，holding.cost -= 2500，holding.marketValue -= 3000，account.cashBalance += 3000（减去手续费）

#### Scenario: 创建卖出交易（shares模式）
- **WHEN** 用户为 shares 模式的持仓（cost=10000, shares=2000）创建卖出交易，股数 500，成交价 6.00，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，amount = 3000，avgCost = 10000/2000 = 5，costReduce = 500 × 5 = 2500，holding.cost -= 2500，holding.shares -= 500，holding.price = 6.00，holding.marketValue = holding.shares × 6.00，account.cashBalance += 3000（减去手续费）
