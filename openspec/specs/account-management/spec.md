## Purpose

定义 account-management 能力的业务约束与验收标准。

## Requirements

### Requirement: 创建账户

系统 SHALL 允许已登录用户创建资金账户，包含以下字段：账户名称（必填）、币种（必填，枚举值：CNY/USD/HKD）、初始现金 cashBalance（必填，数值类型，原始币种）。不再包含本金（totalCost）字段。创建时 MUST 自动绑定当前用户 ID。

#### Scenario: 成功创建 CNY 账户

- **WHEN** 已登录用户填写账户名称为"A股券商"，币种为 CNY，初始现金为 200000
- **THEN** 系统创建该账户，cashBalance=200000，userId=当前用户ID

#### Scenario: 创建账户无本金选项

- **WHEN** 用户打开添加账户表单
- **THEN** 表单只显示账户名称、币种、初始现金三个字段，不显示本金输入项

#### Scenario: 未登录创建账户

- **WHEN** 未登录用户请求 POST /api/accounts
- **THEN** 系统返回 401 Unauthorized

### Requirement: 编辑账户

系统 SHALL 允许用户编辑已有账户的名称、币种、现金余额（cashBalance）。不再包含本金（totalCost）编辑项。

#### Scenario: 更新账户现金余额

- **WHEN** 用户将"A股券商"账户现金余额从 50000 修改为 60000
- **THEN** 系统更新 cashBalance=60000，账户总价值自动重算为 60000 + 持仓市值之和

#### Scenario: 编辑账户无本金选项

- **WHEN** 用户打开编辑账户弹窗
- **THEN** 弹窗只显示账户名称、币种、现金余额三个字段，不显示本金输入项

### Requirement: 账户盈亏计算

账户持仓盈亏 SHALL 使用 `formatAmount()` 格式化显示金额部分。

#### Scenario: 账户持仓盈利

- **WHEN** 账户持仓盈利 15000
- **THEN** 显示为 `+¥15,000`

#### Scenario: 账户持仓亏损

- **WHEN** 账户持仓亏损 20000.5
- **THEN** 显示为 `-¥20,000.5`

### Requirement: 删除账户

系统 SHALL 允许已登录用户删除自己的账户。删除账户时 MUST 同时删除该账户下的所有持仓和交易记录。MUST 验证账户属于当前用户。

#### Scenario: 删除有持仓和交易的账户

- **WHEN** 用户删除包含持仓和交易记录的"A股券商"账户
- **THEN** 系统删除该账户及其下所有持仓和交易记录，总资产相应减少

#### Scenario: 删除前确认

- **WHEN** 用户点击删除账户按钮
- **THEN** 系统显示确认对话框，提示将同时删除该账户下的所有持仓和交易记录

#### Scenario: 不能删除他人账户

- **WHEN** 用户尝试删除不属于自己的账户
- **THEN** 系统返回 404

### Requirement: 账户现金余额

系统 SHALL 将 cashBalance 作为账户的独立字段存储，表示账户中未投入持仓的现金。现金余额通过交易（买入/卖出/存入/取出/股息）自动更新，也可通过编辑账户手动修改。

#### Scenario: 现金不受股价变动影响

- **WHEN** 账户 cashBalance=50000，持仓市值从 200000 涨到 220000
- **THEN** cashBalance 仍为 50000，不受持仓市值变化影响

#### Scenario: 买入后现金减少

- **WHEN** 账户 cashBalance=50000，用户买入 10000 元股票
- **THEN** cashBalance 变为 40000

### Requirement: 账户列表展示

账户列表中的数值 SHALL 使用统一格式化函数显示：

- 总价值、现金余额：使用 `formatAmount()` 格式化（最多2位小数，整数不显示小数点，带千位分隔符）
- 持仓盈亏金额：使用 `formatAmount()` 格式化
- 盈亏百分比：使用 `formatPercent()` 格式化

#### Scenario: 账户总价值为整数

- **WHEN** 账户总价值为 100000
- **THEN** 显示为 `¥100,000`（不显示小数点）

#### Scenario: 账户总价值有小数

- **WHEN** 账户总价值为 100000.5
- **THEN** 显示为 `¥100,000.5`（去除尾部零）

### Requirement: 账户管理页使用 LoadingSpinner 加载动画

账户管理页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，包括 Suspense fallback。

#### Scenario: 账户页加载中

- **WHEN** 账户管理页正在获取账户和资产配置数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

#### Scenario: 账户页 Suspense fallback

- **WHEN** 账户页 Suspense 边界等待异步内容
- **THEN** fallback 显示 LoadingSpinner 组件
