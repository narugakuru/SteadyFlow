## Requirements

### Requirement: 创建账户
系统 SHALL 允许用户创建资金账户，包含以下字段：账户名称（必填）、币种（必填，枚举值：CNY/USD/HKD）、初始现金 cashBalance（必填，数值类型，原始币种）、账户本金 totalCost（选填，数值类型，默认等于 cashBalance）。

#### Scenario: 成功创建 CNY 账户
- **WHEN** 用户填写账户名称为"A股券商"，币种为 CNY，初始现金为 200000
- **THEN** 系统创建该账户，cashBalance=200000，totalCost=200000

#### Scenario: 创建账户自定义本金
- **WHEN** 用户填写账户名称为"美股券商"，币种为 USD，初始现金为 10000，本金为 8000
- **THEN** 系统创建该账户，cashBalance=10000，totalCost=8000

#### Scenario: 创建账户不填本金
- **WHEN** 用户填写账户名称为"港股券商"，币种为 HKD，初始现金为 50000，不填本金
- **THEN** 系统创建该账户，cashBalance=50000，totalCost=50000（默认等于初始现金）

### Requirement: 编辑账户
系统 SHALL 允许用户编辑已有账户的名称、币种、现金余额（cashBalance）和本金（totalCost）。手动编辑与交易记录两种修改路径操作同一字段，后操作覆盖前操作。

#### Scenario: 更新账户现金余额
- **WHEN** 用户将"A股券商"账户现金余额从 50000 修改为 60000
- **THEN** 系统更新 cashBalance=60000，账户总价值自动重算为 60000 + 持仓市值之和

#### Scenario: 更新账户本金
- **WHEN** 用户将"A股券商"账户本金从 200000 修改为 180000
- **THEN** 系统更新 totalCost=180000，账户盈亏自动重算

### Requirement: 账户盈亏计算
系统 SHALL 自动计算每个账户的盈亏，公式为：盈亏 = (cashBalance + holdingsValue) - totalCost。其中 holdingsValue = Σ 该账户所有持仓的 marketValue。

#### Scenario: 账户盈利（含持仓增值）
- **WHEN** 账户 cashBalance=50000，持仓市值合计=200000，totalCost=200000
- **THEN** 账户总价值=250000，盈亏显示 +¥50,000 (+25.00%)

#### Scenario: 股价上涨后盈亏自动更新
- **WHEN** 账户 cashBalance=50000，持仓市值从 200000 涨到 220000，totalCost=200000
- **THEN** 账户总价值从 250000 变为 270000，盈亏从 +¥50,000 变为 +¥70,000

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

### Requirement: 账户现金余额
系统 SHALL 将 cashBalance 作为账户的独立字段存储，表示账户中未投入持仓的现金。现金余额通过交易（买入/卖出/存入/取出/股息）自动更新，也可通过编辑账户手动修改。

#### Scenario: 现金不受股价变动影响
- **WHEN** 账户 cashBalance=50000，持仓市值从 200000 涨到 220000
- **THEN** cashBalance 仍为 50000，不受持仓市值变化影响

#### Scenario: 买入后现金减少
- **WHEN** 账户 cashBalance=50000，用户买入 10000 元股票
- **THEN** cashBalance 变为 40000

### Requirement: 账户列表展示
系统 SHALL 在账户页面以展开/折叠模式展示所有账户。每个账户行显示：账户名称、币种、总价值（cashBalance + holdingsValue，原始币种）、本金（原始币种）、盈亏、现金余额（cashBalance）、持仓数量。点击账户行 SHALL 展开/折叠该账户的详情区域。

#### Scenario: 账户列表默认折叠
- **WHEN** 用户打开账户页面
- **THEN** 所有账户行默认折叠，显示摘要信息，行首有展开/折叠指示符（▶/▼）

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
- **THEN** 列表中每个账户显示原始币种总价值、本金、盈亏和现金余额

### Requirement: 账户展开区域编辑账户
系统 SHALL 在账户展开区域提供"编辑账户"按钮，点击后弹出账户编辑弹窗，可修改账户名称、币种、现金余额和本金。

#### Scenario: 从展开区域编辑账户
- **WHEN** 用户展开某账户后点击"编辑账户"按钮
- **THEN** 弹出账户编辑弹窗，保存后账户信息和持仓列表自动刷新
