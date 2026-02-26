## MODIFIED Requirements

### Requirement: 交易不影响余额开关
系统 SHALL 提供两个独立的副作用控制开关：`affectCash`（影响账户现金，默认开启）和 `affectHolding`（影响持仓数据，默认开启）。买入/卖出交易 SHALL 显示两个开关；股息/存入/取出交易 SHALL 只显示"影响账户现金"开关。

#### Scenario: 录入已有持仓（只影响持仓不扣现金）
- **WHEN** 用户创建买入交易，金额 80000，开启"影响持仓数据"，关闭"影响账户现金"
- **THEN** 系统创建交易记录，holding.cost += 80000，holding.marketValue += 80000，但 account.cashBalance 不变

#### Scenario: 补录历史交易（都不影响）
- **WHEN** 用户创建买入交易，金额 5000，关闭"影响账户现金"，关闭"影响持仓数据"
- **THEN** 系统创建交易记录，但 holding 和 account 的数值字段均不变

#### Scenario: 正常买入交易（都影响）
- **WHEN** 用户创建买入交易，金额 10000，两个开关都开启（默认）
- **THEN** 系统创建交易记录，holding 数据更新，account.cashBalance -= 10000（加手续费）

#### Scenario: 只扣现金不更新持仓
- **WHEN** 用户创建买入交易，金额 10000，开启"影响账户现金"，关闭"影响持仓数据"
- **THEN** 系统创建交易记录，account.cashBalance -= 10000（加手续费），但 holding 数据不变

#### Scenario: 股息交易只显示现金开关
- **WHEN** 用户选择"股息"交易类型
- **THEN** 表单只显示"影响账户现金"开关，不显示"影响持仓数据"开关

#### Scenario: 存入/取出交易只显示现金开关
- **WHEN** 用户选择"现金存入"或"现金取出"交易类型
- **THEN** 表单只显示"影响账户现金"开关

### Requirement: 创建交易记录
系统 SHALL 允许用户创建交易记录，交易类型包括：买入(buy)、卖出(sell)、股息(dividend)、现金存入(deposit)、现金取出(withdraw)。交易记录 SHALL 存储 `affectCash` 和 `affectHolding` 两个独立字段。API SHALL 同时支持旧参数 `affectBalance`（等价于同时设置两个新字段）以保持兼容。

#### Scenario: 创建买入交易（amount模式）
- **WHEN** 用户为 amount 模式的持仓"余额宝"创建买入交易，金额 5000，手续费 0，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，holding.cost += 5000，holding.marketValue += 5000，account.cashBalance -= 5000

#### Scenario: 创建买入交易（shares模式）
- **WHEN** 用户为 shares 模式的持仓"沪深300ETF"创建买入交易，股数 1000，成交价 3.85，手续费 5，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，amount 自动计算为 3850，holding.cost += 3850，holding.shares += 1000，holding.marketValue = holding.shares × holding.price，account.cashBalance -= 3855

#### Scenario: 创建卖出交易（amount模式）
- **WHEN** 用户为 amount 模式的持仓（cost=5000, marketValue=6000）创建卖出交易，金额 3000，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，costReduce = 3000 × 5000 / 6000 = 2500，holding.cost -= 2500，holding.marketValue -= 3000，account.cashBalance += 3000（减去手续费）

#### Scenario: 创建卖出交易（shares模式）
- **WHEN** 用户为 shares 模式的持仓（cost=10000, shares=2000）创建卖出交易，股数 500，成交价 6.00，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，amount = 3000，avgCost = 10000/2000 = 5，costReduce = 500 × 5 = 2500，holding.cost -= 2500，holding.shares -= 500，holding.marketValue = holding.shares × holding.price，account.cashBalance += 3000（减去手续费）

#### Scenario: 创建股息交易
- **WHEN** 用户创建股息交易，关联持仓"腾讯"，金额 500，affectCash=true
- **THEN** 系统创建交易记录，account.cashBalance += 500（减去手续费），持仓 cost/shares 不变

#### Scenario: 创建现金存入交易
- **WHEN** 用户为"A股券商"账户创建现金存入交易，金额 50000，affectCash=true
- **THEN** 系统创建交易记录，account.totalCost += 50000，account.cashBalance += 50000

#### Scenario: 创建现金取出交易
- **WHEN** 用户为"A股券商"账户创建现金取出交易，金额 20000，affectCash=true
- **THEN** 系统创建交易记录，account.totalCost -= 20000，account.cashBalance -= 20000

#### Scenario: API 兼容旧参数
- **WHEN** API 收到 `affectBalance: false`（不含 affectCash/affectHolding）
- **THEN** 系统将 affectCash 和 affectHolding 都设为 false

#### Scenario: 新参数优先于旧参数
- **WHEN** API 同时收到 `affectBalance: false` 和 `affectCash: true, affectHolding: false`
- **THEN** 系统使用新参数：affectCash=true，affectHolding=false

### Requirement: 交易手续费
系统 SHALL 支持在交易中记录手续费，手续费从账户现金余额中扣除（受 affectCash 控制）。

#### Scenario: 买入含手续费
- **WHEN** 用户创建买入交易，金额 10000，手续费 15，affectCash=true
- **THEN** account.cashBalance -= 10015（金额+手续费）

#### Scenario: 卖出含手续费
- **WHEN** 用户创建卖出交易，金额 10000，手续费 15，affectCash=true
- **THEN** account.cashBalance += 9985（金额-手续费）

### Requirement: 交易记录列表
系统 SHALL 在交易页面展示交易记录列表，按交易时间倒序排列，显示：交易类型、关联账户、关联持仓（如有）、金额、股数（如有）、成交价（如有）、手续费、备注、交易日期。副作用状态 SHALL 显示为标签（如"仅记录"、"不扣现金"、"不更新持仓"）。

#### Scenario: 显示副作用状态标签
- **WHEN** 交易记录 affectCash=false, affectHolding=true
- **THEN** 该交易显示"不扣现金"标签

#### Scenario: 两个都关闭
- **WHEN** 交易记录 affectCash=false, affectHolding=false
- **THEN** 该交易显示"仅记录"标签

#### Scenario: 两个都开启
- **WHEN** 交易记录 affectCash=true, affectHolding=true
- **THEN** 该交易不显示额外标签（默认行为）
