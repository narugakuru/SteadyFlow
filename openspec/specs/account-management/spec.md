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

系统 SHALL 自动计算每个账户的持仓盈亏，公式为：持仓盈亏 = Σ(holding.marketValue - holding.cost)，仅累计该账户下各持仓的盈亏。不再使用 totalCost 字段。

#### Scenario: 账户持仓盈利

- **WHEN** 账户有两个持仓：持仓A cost=50000 marketValue=60000，持仓B cost=30000 marketValue=35000
- **THEN** 账户持仓盈亏显示 +¥15,000

#### Scenario: 账户持仓亏损

- **WHEN** 账户有一个持仓：cost=100000 marketValue=80000
- **THEN** 账户持仓盈亏显示 -¥20,000

#### Scenario: 账户无持仓

- **WHEN** 账户没有任何持仓
- **THEN** 账户持仓盈亏显示为"--"

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

### Requirement: 账户管理页使用 LoadingSpinner 加载动画

账户管理页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，包括 Suspense fallback。

#### Scenario: 账户页加载中

- **WHEN** 账户管理页正在获取账户和资产配置数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

#### Scenario: 账户页 Suspense fallback

- **WHEN** 账户页 Suspense 边界等待异步内容
- **THEN** fallback 显示 LoadingSpinner 组件
