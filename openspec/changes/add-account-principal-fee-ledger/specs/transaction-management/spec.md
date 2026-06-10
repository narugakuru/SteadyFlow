## MODIFIED Requirements

### Requirement: 创建交易记录

系统 SHALL 允许已登录用户为自己的账户创建交易记录，交易类型包括：买入(buy)、卖出(sell)、股息(dividend)、现金存入(deposit)、现金取出(withdraw)、费用扣除(fee)。创建交易前 MUST 验证目标账户属于当前用户。交易记录 SHALL 存储 `affectCash` 和 `affectHolding` 两个独立字段。API SHALL 同时支持旧参数 `affectBalance`（等价于同时设置两个新字段）以保持兼容。系统 MUST 为新交易存储现金、本金、持仓和 realizedPnl 的副作用 delta。

shares 模式买入副作用（affectHolding=true）：

- cost 按加权平均法重算：`newCost = (oldCost × oldShares + txPrice × txShares) / (oldShares + txShares)`
- shares += txShares
- price = txPrice（更新为成交价）
- marketValue = newShares × newPrice
- holdingSharesDelta = txShares
- holdingCostDelta = txPrice × txShares

shares 模式卖出副作用（affectHolding=true）：

- cost 不变
- shares -= txShares
- price = txPrice（更新为成交价）
- marketValue = newShares × newPrice
- holdingSharesDelta = -txShares
- holdingCostDelta = -(oldCost × txShares)

amount 模式买入副作用（affectHolding=true）：

- cost += amount
- marketValue += amount
- holdingCostDelta = amount
- holdingMarketValueDelta = amount

amount 模式卖出副作用（affectHolding=true）：

- costReduce = amount × cost / marketValue（按比例扣减）
- cost -= costReduce
- marketValue -= amount
- holdingCostDelta = -costReduce
- holdingMarketValueDelta = -amount

#### Scenario: shares 模式买入（加权平均成本）

- **WHEN** 已登录用户对 shares 模式持仓（cost=10, shares=100）创建买入交易，txShares=50, txPrice=12, affectHolding=true
- **THEN** newCost = (10×100 + 12×50) / 150 = 10.67, shares=150, price=12, marketValue=150×12=1800，并记录 shares/cost delta

#### Scenario: 创建费用扣除交易

- **WHEN** 已登录用户为自己的账户创建费用扣除交易，金额 100
- **THEN** 系统创建交易记录，account.cashBalance -= 100，account.realizedPnl -= 100，account.principal 不变

#### Scenario: 不能为他人账户创建交易

- **WHEN** 用户尝试为不属于自己的账户创建交易
- **THEN** 系统返回 404

### Requirement: 卖出交易了结盈亏计算

系统 SHALL 在创建交易时为卖出、股息和费用扣除交易计算并存储 `realizedPnl`。买入交易的手续费 MUST 作为负的 `realizedPnl` 计入交易成本损耗。卖出交易仅当 `type=sell` 且 `affectHolding=true` 时参与卖出盈亏计算；股息交易仅当 `type=dividend` 且 `affectCash=true` 时参与计算，且 `realizedPnl = amount - fee`；费用扣除交易的 `realizedPnl = -amount`。手续费 MUST 计入该笔了结盈亏；其余交易 `realizedPnl` MUST 为 `0`。

#### Scenario: affectHolding=true 的卖出计入了结盈亏

- **WHEN** 用户创建一笔卖出交易，`type=sell` 且 `affectHolding=true`
- **THEN** 系统计算并存储该笔交易 `realizedPnl`，并将手续费计入净收益

#### Scenario: 买入手续费计入费用损耗

- **WHEN** 用户创建一笔买入交易，金额 10000，手续费 10
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `-10`

#### Scenario: 费用扣除计入了结盈亏

- **WHEN** 用户创建一笔费用扣除交易，金额 100
- **THEN** 系统将该笔交易 `realizedPnl` 存储为 `-100`

### Requirement: 删除交易记录

系统 SHALL 允许已登录用户删除自己的交易记录。删除交易 MUST 回滚该交易创建时记录的现金、本金、持仓和账户累计了结盈亏副作用 delta，并删除交易记录。删除过程 MUST 使用事务或原子批处理，任一步骤失败时 MUST 整体回滚。MUST 验证交易所属账户属于当前用户。若回滚会导致持仓 shares、成本或市值为非法负数，系统 MUST 拒绝删除。

#### Scenario: 删除入金交易回滚现金和本金

- **WHEN** 用户删除一笔入金交易，cashDelta=1000，principalDelta=1000
- **THEN** 系统删除该交易，并将账户现金和 principal 各减少 1000

#### Scenario: 删除费用交易回滚现金和了结盈亏

- **WHEN** 用户删除一笔费用交易，cashDelta=-100，realizedPnl=-100
- **THEN** 系统删除该交易，并将账户现金增加 100，账户累计 realizedPnl 增加 100

#### Scenario: 删除买入交易回滚持仓

- **WHEN** 用户删除一笔买入交易，且回滚后持仓数值仍合法
- **THEN** 系统按交易 delta 反向更新持仓 shares、成本和市值

#### Scenario: 不能删除他人交易

- **WHEN** 用户尝试删除不属于自己账户的交易记录
- **THEN** 系统返回 404

### Requirement: 交易副作用控制开关

系统 SHALL 提供两个独立的副作用控制开关：`affectCash`（影响账户现金，默认开启）和 `affectHolding`（影响持仓数据，默认开启）。买入/卖出交易 SHALL 显示两个开关；股息/存入/取出交易 SHALL 只显示"影响账户现金"开关；费用扣除交易 MUST 固定影响账户现金和 realizedPnl，不显示持仓选择器或持仓副作用开关。"影响账户现金"开关 SHALL 紧跟在账户选择器下方，"影响持仓数据"开关 SHALL 紧跟在持仓选择器下方。

#### Scenario: 费用扣除不显示持仓控制

- **WHEN** 用户选择"费用扣除"交易类型
- **THEN** 表单不显示持仓选择器和"影响持仓数据"开关

#### Scenario: 存入/取出交易只显示现金开关

- **WHEN** 用户选择"现金存入"或"现金取出"交易类型
- **THEN** 表单只显示"影响账户现金"开关

### Requirement: 交易记录列表

系统 SHALL 在交易页面展示当前用户的交易记录列表，按交易时间倒序排列。列表展示 SHALL 使用横向表格布局，列顺序固定为：账户、标的名称、操作类型（买入/卖出等）、股数、股价、金额、手续费、盈亏、日期。删除操作 SHALL 使用与账户页一致的小垃圾桶图标按钮样式。副作用状态 SHALL 继续显示为标签。费用扣除交易的操作类型 SHALL 显示为“费用扣除”，持仓列显示 `--`。

#### Scenario: 费用扣除交易列表展示

- **WHEN** 已登录用户查看一笔费用扣除交易
- **THEN** 操作类型显示“费用扣除”，持仓列显示 `--`，盈亏列显示负的费用金额

#### Scenario: 空交易列表

- **WHEN** 用户没有任何交易记录
- **THEN** 显示"暂无交易记录"提示
