## Purpose

定义 transaction-management 能力的业务约束与验收标准。

## Requirements

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

系统 SHALL 允许已登录用户删除自己的交易记录。删除交易 MUST NOT 回滚对持仓或账户的修改。MUST 验证交易所属账户属于当前用户。

#### Scenario: 删除交易不回滚

- **WHEN** 用户删除一笔买入交易记录
- **THEN** 系统删除该交易记录，holding 和 account 的 cost/marketValue/shares 等字段保持不变

#### Scenario: 不能删除他人交易

- **WHEN** 用户尝试删除不属于自己账户的交易记录
- **THEN** 系统返回 404

### Requirement: 交易不可编辑

系统 MUST NOT 允许编辑已创建的交易记录，只能删除后重新创建。

#### Scenario: 交易记录无编辑入口

- **WHEN** 用户查看交易记录列表
- **THEN** 每条交易只显示删除按钮，不显示编辑按钮

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

### Requirement: 交易记录页使用 LoadingSpinner 加载动画

交易记录页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，包括 Suspense fallback。

#### Scenario: 交易页加载中

- **WHEN** 交易记录页正在获取交易、账户、持仓数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

#### Scenario: 交易页 Suspense fallback

- **WHEN** 交易页 Suspense 边界等待异步内容
- **THEN** fallback 显示 LoadingSpinner 组件

### Requirement: 交易记录数值显示

交易记录列表和表单中的数值 SHALL 使用统一格式化函数：

- 交易金额：使用 `formatAmount()` 格式化
- 交易价格：使用 `formatPrice()` 格式化
- 交易份额：使用 `formatShares()` 格式化
- 手续费：使用 `formatAmount()` 格式化

#### Scenario: 交易金额显示

- **WHEN** 交易金额为 15000
- **THEN** 显示为 `¥15,000`

#### Scenario: 交易价格显示

- **WHEN** 交易价格为 3.141
- **THEN** 显示为 `3.141`
