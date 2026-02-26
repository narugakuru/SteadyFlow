## MODIFIED Requirements

### Requirement: 创建交易记录

系统 SHALL 允许已登录用户为自己的账户创建交易记录，交易类型包括：买入(buy)、卖出(sell)、股息(dividend)、现金存入(deposit)、现金取出(withdraw)。创建交易前 MUST 验证目标账户属于当前用户。交易记录 SHALL 存储 `affectCash` 和 `affectHolding` 两个独立字段。API SHALL 同时支持旧参数 `affectBalance`（等价于同时设置两个新字段）以保持兼容。

#### Scenario: 创建买入交易（amount模式）

- **WHEN** 已登录用户为自己账户中 amount 模式的持仓"余额宝"创建买入交易，金额 5000，手续费 0，affectCash=true，affectHolding=true
- **THEN** 系统创建交易记录，holding.cost += 5000，holding.marketValue += 5000，account.cashBalance -= 5000

#### Scenario: 不能为他人账户创建交易

- **WHEN** 用户尝试为不属于自己的账户创建交易
- **THEN** 系统返回 404

### Requirement: 交易记录列表

系统 SHALL 在交易页面展示当前用户的交易记录列表，按交易时间倒序排列，显示：交易类型、关联账户、关联持仓（如有）、金额、股数（如有）、成交价（如有）、手续费、备注、交易日期。副作用状态 SHALL 显示为标签。

#### Scenario: 交易列表展示

- **WHEN** 已登录用户打开交易页面
- **THEN** 系统按时间倒序展示当前用户的所有交易记录，不显示其他用户的交易

#### Scenario: 空交易列表

- **WHEN** 用户没有任何交易记录
- **THEN** 显示"暂无交易记录"提示

### Requirement: 交易记录筛选

系统 SHALL 支持按当前用户的账户、交易类型和持仓筛选交易记录。筛选器中的账户和持仓选项 MUST 只包含当前用户的数据。

#### Scenario: 按账户筛选

- **WHEN** 用户选择筛选条件为"A股券商"
- **THEN** 列表只显示该账户下的交易记录

#### Scenario: 筛选器只显示用户自己的数据

- **WHEN** 用户打开交易页面的筛选器
- **THEN** 账户下拉只显示当前用户的账户，持仓下拉只显示当前用户的持仓

### Requirement: 删除交易记录

系统 SHALL 允许已登录用户删除自己的交易记录。删除交易 MUST NOT 回滚对持仓或账户的修改。MUST 验证交易所属账户属于当前用户。

#### Scenario: 删除交易不回滚

- **WHEN** 用户删除一笔买入交易记录
- **THEN** 系统删除该交易记录，holding 和 account 的 cost/marketValue/shares 等字段保持不变

#### Scenario: 不能删除他人交易

- **WHEN** 用户尝试删除不属于自己账户的交易记录
- **THEN** 系统返回 404
