## MODIFIED Requirements

### Requirement: 创建账户
系统 SHALL 允许用户创建资金账户，包含以下字段：账户名称（必填）、币种（必填，枚举值：CNY/USD/HKD）、初始现金 cashBalance（必填，数值类型，原始币种）。不再包含本金（totalCost）字段。

#### Scenario: 成功创建 CNY 账户
- **WHEN** 用户填写账户名称为"A股券商"，币种为 CNY，初始现金为 200000
- **THEN** 系统创建该账户，cashBalance=200000

#### Scenario: 创建账户无本金选项
- **WHEN** 用户打开添加账户表单
- **THEN** 表单只显示账户名称、币种、初始现金三个字段，不显示本金输入项

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

### Requirement: 账户列表展示
系统 SHALL 在账户页面以展开/折叠模式展示所有账户。每个账户行显示：账户名称、币种、总价值（cashBalance + holdingsValue，原始币种）、持仓盈亏、现金余额（cashBalance）、持仓数量。不再显示本金列。点击账户行 SHALL 展开/折叠该账户的详情区域。

#### Scenario: 账户列表默认折叠
- **WHEN** 用户打开账户页面
- **THEN** 所有账户行默认折叠，显示摘要信息（无本金列），行首有展开/折叠指示符（▶/▼）

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
- **THEN** 账户页自动展开 id=3 的账户详情区域

#### Scenario: 多币种账户列表
- **WHEN** 用户有 CNY 和 USD 两个账户
- **THEN** 列表中每个账户显示原始币种总价值、持仓盈亏和现金余额

### Requirement: 账户展开区域编辑账户
系统 SHALL 在账户展开区域提供"编辑账户"按钮，点击后弹出账户编辑弹窗，可修改账户名称、币种、现金余额。不再包含本金编辑项。

#### Scenario: 从展开区域编辑账户
- **WHEN** 用户展开某账户后点击"编辑账户"按钮
- **THEN** 弹出账户编辑弹窗（无本金字段），保存后账户信息和持仓列表自动刷新

## REMOVED Requirements

### Requirement: 创建账户自定义本金
**Reason**: 本金字段已删除，不再支持自定义本金
**Migration**: 账户盈亏改为持仓盈亏自动计算

### Requirement: 更新账户本金
**Reason**: 本金字段已删除
**Migration**: 盈亏由持仓数据自动派生，无需手动维护本金
