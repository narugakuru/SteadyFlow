## Requirements

### Requirement: 创建账户
系统 SHALL 允许用户创建资金账户，包含以下字段：账户名称（必填）、币种（必填，枚举值：CNY/USD/HKD）、账户总额/市值 totalBalance（必填，数值类型，原始币种）、账户本金 totalCost（选填，数值类型，默认 0）。

#### Scenario: 成功创建 CNY 账户
- **WHEN** 用户填写账户名称为"A股券商"，币种为 CNY，总额为 200000，本金为 200000
- **THEN** 系统创建该账户，totalBalance=200000，totalCost=200000

#### Scenario: 创建账户不填本金
- **WHEN** 用户填写账户名称为"美股券商"，币种为 USD，总额为 10000，不填本金
- **THEN** 系统创建该账户，totalBalance=10000，totalCost=0

### Requirement: 编辑账户
系统 SHALL 允许用户编辑已有账户的名称、币种、总额（totalBalance）和本金（totalCost）。手动编辑与交易记录两种修改路径操作同一字段，后操作覆盖前操作。

#### Scenario: 更新账户总额
- **WHEN** 用户将"A股券商"账户总额从 200000 修改为 250000
- **THEN** 系统更新 totalBalance，现金自动重新计算为 250000 - Σ该账户持仓市值

#### Scenario: 更新账户本金
- **WHEN** 用户将"A股券商"账户本金从 200000 修改为 180000
- **THEN** 系统更新 totalCost=180000，账户盈亏自动重算

### Requirement: 账户盈亏计算
系统 SHALL 自动计算每个账户的盈亏，公式为：盈亏 = totalBalance - totalCost。

#### Scenario: 账户盈利
- **WHEN** 账户 totalBalance=250000，totalCost=200000
- **THEN** 账户盈亏显示 +¥50,000

#### Scenario: 账户本金为零
- **WHEN** 账户 totalCost=0
- **THEN** 账户盈亏显示为"--"

### Requirement: 删除账户
系统 SHALL 允许用户删除账户。删除账户时 MUST 同时删除该账户下的所有持仓和交易记录。

#### Scenario: 删除有持仓和交易的账户
- **WHEN** 用户删除包含持仓和交易记录的"A股券商"账户
- **THEN** 系统删除该账户及其下所有持仓和交易记录，总资产相应减少

#### Scenario: 删除前确认
- **WHEN** 用户点击删除账户按钮
- **THEN** 系统显示确认对话框，提示将同时删除该账户下的所有持仓和交易记录

### Requirement: 账户现金自动计算
系统 SHALL 自动计算每个账户的现金余额，公式为：账户现金 = 账户总额 - 该账户所有持仓市值之和。现金值 MUST 不允许为负数。

#### Scenario: 现金随持仓变化自动更新
- **WHEN** 账户总额为 200000，持仓市值合计为 150000
- **THEN** 账户现金显示为 50000

#### Scenario: 持仓市值超过账户总额
- **WHEN** 用户添加持仓导致持仓市值合计超过账户总额
- **THEN** 系统显示警告提示用户更新账户总额，现金显示为 0（不显示负数）

### Requirement: 账户列表展示
系统 SHALL 在账户页面展示所有账户列表，每个账户显示：账户名称、币种、总额/市值（原始币种）、本金（原始币种）、盈亏、现金余额、持仓数量。

#### Scenario: 多币种账户列表
- **WHEN** 用户有 CNY 和 USD 两个账户
- **THEN** 列表中每个账户显示原始币种总额、本金、盈亏和 CNY 换算总额，底部显示所有账户 CNY 总计
