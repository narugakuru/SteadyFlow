## MODIFIED Requirements

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

### Requirement: 账户列表展示

系统 SHALL 在账户页面以展开/折叠模式展示当前用户的所有账户。每个账户行显示：账户名称、币种、总价值（cashBalance + holdingsValue，原始币种）、持仓盈亏、现金余额（cashBalance）、持仓数量。不再显示本金列。点击账户行 SHALL 展开/折叠该账户的详情区域。

#### Scenario: 账户列表默认折叠

- **WHEN** 已登录用户打开账户页面
- **THEN** 显示当前用户的所有账户行（默认折叠），不显示其他用户的账户

#### Scenario: 展开账户详情

- **WHEN** 用户点击某账户行
- **THEN** 该行下方展开详情区域，显示账户摘要（总价值/持仓市值/现金）、操作按钮（编辑账户、添加持仓）和该账户下的持仓列表

#### Scenario: 展开区域持仓列表

- **WHEN** 账户展开且有持仓
- **THEN** 持仓列表使用统一的 HoldingRow 格式展示，每个持仓提供交易、编辑、交易记录、删除四个操作按钮

#### Scenario: 展开区域无持仓

- **WHEN** 账户展开但无持仓
- **THEN** 显示"暂无持仓"提示

#### Scenario: 通过 URL 参数自动展开

- **WHEN** 用户访问 /accounts?accountId=3
- **THEN** 账户页自动展开 id=3 的账户详情区域（前提是该账户属于当前用户）

#### Scenario: 多币种账户列表

- **WHEN** 用户有 CNY 和 USD 两个账户
- **THEN** 列表中每个账户显示原始币种总价值、持仓盈亏和现金余额

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
