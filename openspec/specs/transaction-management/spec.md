## Requirements

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

#### Scenario: 创建股息交易不关联持仓
- **WHEN** 用户创建股息交易，不关联任何持仓（如银行利息），金额 100
- **THEN** 系统创建交易记录，account.cashBalance += 100，holdingId 为空

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

### Requirement: 交易副作用控制开关
系统 SHALL 提供两个独立的副作用控制开关：`affectCash`（影响账户现金，默认开启）和 `affectHolding`（影响持仓数据，默认开启）。买入/卖出交易 SHALL 显示两个开关；股息/存入/取出交易 SHALL 只显示"影响账户现金"开关。"影响账户现金"开关 SHALL 紧跟在账户选择器下方，"影响持仓数据"开关 SHALL 紧跟在持仓选择器下方。

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

### Requirement: 交易自定义时间
系统 SHALL 允许用户自定义交易时间，交易时间可以是过去的任意日期。

#### Scenario: 补录历史交易
- **WHEN** 用户创建交易，手动设置交易日期为 2025-01-15
- **THEN** 系统以 2025-01-15 作为交易日期存储

### Requirement: 删除交易记录
系统 SHALL 允许用户删除交易记录。删除交易 MUST NOT 回滚对持仓或账户的修改。

#### Scenario: 删除交易不回滚
- **WHEN** 用户删除一笔买入交易记录
- **THEN** 系统删除该交易记录，holding 和 account 的 cost/marketValue/shares 等字段保持不变

### Requirement: 交易不可编辑
系统 MUST NOT 允许编辑已创建的交易记录，只能删除后重新创建。

#### Scenario: 交易记录无编辑入口
- **WHEN** 用户查看交易记录列表
- **THEN** 每条交易只显示删除按钮，不显示编辑按钮

### Requirement: 交易记录列表
系统 SHALL 在交易页面展示交易记录列表，按交易时间倒序排列，显示：交易类型、关联账户、关联持仓（如有）、金额、股数（如有）、成交价（如有）、手续费、备注、交易日期。副作用状态 SHALL 显示为标签（如"仅记录"、"不扣现金"、"不更新持仓"）。

#### Scenario: 交易列表展示
- **WHEN** 用户打开交易页面
- **THEN** 系统按时间倒序展示所有交易记录

#### Scenario: 空交易列表
- **WHEN** 用户没有任何交易记录
- **THEN** 显示"暂无交易记录"提示

#### Scenario: 显示副作用状态标签
- **WHEN** 交易记录 affectCash=false, affectHolding=true
- **THEN** 该交易显示"不扣现金"标签

#### Scenario: 两个都关闭
- **WHEN** 交易记录 affectCash=false, affectHolding=false
- **THEN** 该交易显示"仅记录"标签

#### Scenario: 两个都开启
- **WHEN** 交易记录 affectCash=true, affectHolding=true
- **THEN** 该交易不显示额外标签（默认行为）

### Requirement: 交易记录筛选
系统 SHALL 支持按账户、交易类型和持仓筛选交易记录。支持通过 URL 参数（accountId、holdingId）预设筛选条件。

#### Scenario: 按账户筛选
- **WHEN** 用户选择筛选条件为"A股券商"
- **THEN** 列表只显示该账户下的交易记录

#### Scenario: 按交易类型筛选
- **WHEN** 用户选择筛选条件为"买入"
- **THEN** 列表只显示买入类型的交易记录

#### Scenario: 组合筛选
- **WHEN** 用户同时选择账户"A股券商"和类型"买入"
- **THEN** 列表只显示该账户下的买入交易

#### Scenario: 通过 URL 参数预设筛选
- **WHEN** 用户从账户详情页点击持仓的"交易记录"链接，跳转到 /transactions?accountId=1
- **THEN** 交易页自动按该账户筛选，筛选器显示对应的账户名称

### Requirement: 交易表单内新建持仓
系统 SHALL 在交易表单的持仓选择器中提供"新建持仓"选项。用户选择后弹出简化版持仓创建表单，创建成功后自动选中新持仓并继续交易流程。

#### Scenario: 买入时新建持仓
- **WHEN** 用户在交易表单选择"买入"类型，选择账户后，在持仓下拉中点击"新建持仓"
- **THEN** 弹出持仓创建表单（包含名称、ticker、估值模式、资产类别），创建成功后自动选中该持仓，用户继续填写交易信息。本金不在此处填写，由交易记录自动累积

#### Scenario: 新建持仓后持仓列表刷新
- **WHEN** 用户通过交易表单内的"新建持仓"创建了一个新持仓
- **THEN** 持仓下拉选择器的列表自动刷新，包含新创建的持仓，且该持仓被自动选中

#### Scenario: 取消新建持仓
- **WHEN** 用户点击"新建持仓"后在创建表单中点击取消
- **THEN** 返回交易表单，持仓选择器保持之前的状态

### Requirement: 交易表单根据估值模式显示不同字段
系统 SHALL 根据所选持仓的 valuationMode 显示不同的交易表单字段。

#### Scenario: shares模式买入表单
- **WHEN** 用户选择 shares 模式的持仓进行买入
- **THEN** 表单显示：股数（必填）、成交价（必填）、金额（自动计算=股数×成交价）、手续费（选填）、备注（选填）

#### Scenario: amount模式买入表单
- **WHEN** 用户选择 amount 模式的持仓进行买入
- **THEN** 表单显示：金额（必填）、手续费（选填）、备注（选填）

#### Scenario: deposit/withdraw表单
- **WHEN** 用户选择现金存入或取出类型
- **THEN** 表单只显示：账户（必填）、金额（必填）、备注（选填），不显示持仓选择

### Requirement: 卖出校验
系统 SHALL 在卖出时进行校验，防止无效操作。

#### Scenario: amount模式卖出时市值为零
- **WHEN** 用户尝试对 marketValue=0 的持仓创建卖出交易
- **THEN** 系统拒绝操作，提示"当前市值为0，无法卖出"

#### Scenario: shares模式卖出超过持有份额
- **WHEN** 用户尝试卖出 600 股，但持仓只有 500 股
- **THEN** 系统拒绝操作，提示"卖出份额不能超过持有份额"
