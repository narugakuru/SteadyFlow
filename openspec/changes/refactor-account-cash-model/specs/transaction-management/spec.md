## MODIFIED Requirements

### Requirement: 创建交易记录
系统 SHALL 允许用户创建交易记录，交易类型包括：买入(buy)、卖出(sell)、股息(dividend)、现金存入(deposit)、现金取出(withdraw)。

#### Scenario: 创建买入交易（amount模式）
- **WHEN** 用户为 amount 模式的持仓"余额宝"创建买入交易，金额 5000，手续费 0
- **THEN** 系统创建交易记录，holding.cost += 5000，holding.marketValue += 5000，account.cashBalance -= 5000

#### Scenario: 创建买入交易（shares模式）
- **WHEN** 用户为 shares 模式的持仓"沪深300ETF"创建买入交易，股数 1000，成交价 3.85，手续费 5
- **THEN** 系统创建交易记录，amount 自动计算为 3850，holding.cost += 3850，holding.shares += 1000，holding.marketValue = holding.shares × holding.price，account.cashBalance -= 3855

#### Scenario: 创建卖出交易（amount模式）
- **WHEN** 用户为 amount 模式的持仓（cost=5000, marketValue=6000）创建卖出交易，金额 3000
- **THEN** 系统创建交易记录，costReduce = 3000 × 5000 / 6000 = 2500，holding.cost -= 2500，holding.marketValue -= 3000，account.cashBalance += 3000（减去手续费）

#### Scenario: 创建卖出交易（shares模式）
- **WHEN** 用户为 shares 模式的持仓（cost=10000, shares=2000）创建卖出交易，股数 500，成交价 6.00
- **THEN** 系统创建交易记录，amount = 3000，avgCost = 10000/2000 = 5，costReduce = 500 × 5 = 2500，holding.cost -= 2500，holding.shares -= 500，holding.marketValue = holding.shares × holding.price，account.cashBalance += 3000（减去手续费）

#### Scenario: 创建股息交易
- **WHEN** 用户创建股息交易，关联持仓"腾讯"，金额 500
- **THEN** 系统创建交易记录，account.cashBalance += 500（减去手续费），持仓 cost/shares 不变

#### Scenario: 创建股息交易不关联持仓
- **WHEN** 用户创建股息交易，不关联任何持仓（如银行利息），金额 100
- **THEN** 系统创建交易记录，account.cashBalance += 100，holdingId 为空

#### Scenario: 创建现金存入交易
- **WHEN** 用户为"A股券商"账户创建现金存入交易，金额 50000
- **THEN** 系统创建交易记录，account.totalCost += 50000，account.cashBalance += 50000

#### Scenario: 创建现金取出交易
- **WHEN** 用户为"A股券商"账户创建现金取出交易，金额 20000
- **THEN** 系统创建交易记录，account.totalCost -= 20000，account.cashBalance -= 20000

### Requirement: 交易手续费
系统 SHALL 支持在交易中记录手续费，手续费从账户现金余额中扣除。

#### Scenario: 买入含手续费
- **WHEN** 用户创建买入交易，金额 10000，手续费 15
- **THEN** account.cashBalance -= 10015（金额+手续费）

#### Scenario: 卖出含手续费
- **WHEN** 用户创建卖出交易，金额 10000，手续费 15
- **THEN** account.cashBalance += 9985（金额-手续费）
