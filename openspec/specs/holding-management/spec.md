## Requirements

### Requirement: 添加持仓
系统 SHALL 允许用户在指定账户下添加持仓，包含以下字段：持仓名称（必填）、股票代码 ticker（选填）、估值模式 valuationMode（必填，"amount" 或 "shares"，默认 "amount"）、本金/成本（必填，数值类型，使用账户的币种）、市值（必填，数值类型，使用账户的币种，默认等于本金）、所属资产类别（必填，从 `asset_classes` 表动态获取可选值，排除"现金"类别）。shares 模式下额外显示：份额 shares（必填）、股价 price（必填），市值自动计算为 shares × price。

#### Scenario: 资产类别下拉动态加载
- **WHEN** 用户打开添加/编辑持仓表单
- **THEN** 资产类别下拉框的选项从 `/api/asset-classes` API 动态获取，排除名称为"现金"的类别

#### Scenario: 使用动态类别创建持仓
- **WHEN** 用户选择一个动态加载的资产类别（如用户自定义的"REITS"）并保存持仓
- **THEN** 系统将该类别名称存入 holdings 表的 `asset_class` 列

#### Scenario: 添加 amount 模式持仓
- **WHEN** 用户在"支付宝"账户下添加持仓"余额宝"，估值模式选择 amount，本金 50000，市值 51000
- **THEN** 系统创建该持仓，valuationMode="amount"，cost=50000，marketValue=51000

#### Scenario: 添加 shares 模式持仓
- **WHEN** 用户在"A股券商"账户下添加持仓"沪深300ETF"，ticker="510300"，估值模式选择 shares，份额 10000，股价 3.85，本金 35000
- **THEN** 系统创建该持仓，valuationMode="shares"，shares=10000，price=3.85，marketValue=38500（自动计算），cost=35000

#### Scenario: 添加持仓时不填市值（amount模式）
- **WHEN** 用户在 amount 模式下添加持仓，本金 50000，未填写市值
- **THEN** 系统创建该持仓，市值默认等于本金 50000

#### Scenario: ticker 留空
- **WHEN** 用户添加持仓时不填写股票代码
- **THEN** 系统正常创建持仓，ticker 为空

### Requirement: 持仓资产类别校验
系统 SHALL 在创建或更新持仓时校验所选资产类别存在于 `asset_classes` 表中（排除"现金"）。

#### Scenario: 提交不存在的资产类别
- **WHEN** API 收到的 `assetClass` 值不存在于 `asset_classes` 表中
- **THEN** 系统返回 400 错误，提示"无效的资产类别"

### Requirement: 编辑持仓
系统 SHALL 允许用户编辑持仓的名称、ticker、本金、市值、份额、股价和所属资产类别。手动编辑与交易记录两种修改路径操作同一字段，后操作覆盖前操作。

#### Scenario: 更新持仓市值（amount模式）
- **WHEN** 用户将 amount 模式持仓"余额宝"市值从 51000 修改为 52000，本金不变
- **THEN** 系统更新市值，收益率自动更新

#### Scenario: 更新持仓股价（shares模式）
- **WHEN** 用户将 shares 模式持仓"沪深300ETF"的股价从 3.85 修改为 4.00
- **THEN** 系统更新股价，marketValue 自动重算为 shares × 4.00

#### Scenario: 编辑持仓份额（shares模式）
- **WHEN** 用户手动将持仓份额从 10000 修改为 12000
- **THEN** 系统更新份额，marketValue 自动重算为 12000 × price

#### Scenario: 变更持仓资产类别
- **WHEN** 用户将某持仓的资产类别从"债券"改为"股票基金"
- **THEN** 系统更新类别归属，资产配置占比自动重新计算

### Requirement: 删除持仓
系统 SHALL 允许用户删除持仓。

#### Scenario: 删除持仓后现金恢复
- **WHEN** 用户删除市值为 80000 的持仓
- **THEN** 系统删除该持仓，账户现金自动增加 80000

### Requirement: 持仓列表展示
系统 SHALL 在账户详情中展示该账户下所有持仓，每个持仓显示：名称、ticker（如有）、估值模式标识、本金（原始币种）、市值（原始币种）、市值（CNY 换算）、盈亏金额（原始币种）、盈亏百分比、所属资产类别、占总资产比例。shares 模式额外显示份额和股价。

#### Scenario: amount 模式持仓展示
- **WHEN** 某 amount 模式持仓本金 ¥50,000，市值 ¥52,000
- **THEN** 显示名称、本金、市值、盈亏 +¥2,000（+4.00%）

#### Scenario: shares 模式持仓展示
- **WHEN** 某 shares 模式持仓 ticker="510300"，份额 10000，股价 3.85，cost=35000
- **THEN** 显示名称、ticker、份额 10000、股价 3.85、市值 38500、盈亏 +¥3,500（+10.00%）

#### Scenario: 本金为零的持仓
- **WHEN** 某持仓本金为 0，市值 ¥10,000
- **THEN** 盈亏显示为"--"，不计算百分比

### Requirement: 收益率计算
系统 SHALL 自动计算每个持仓的收益率，公式为：收益率 = (当前市值 - 投入本金) / 投入本金 × 100%。本金为 0 时收益率显示为 N/A。

#### Scenario: 正收益
- **WHEN** 持仓本金 80000，市值 90000
- **THEN** 收益率显示 +12.50%，绿色

#### Scenario: 负收益
- **WHEN** 持仓本金 80000，市值 70000
- **THEN** 收益率显示 -12.50%，红色

#### Scenario: 零收益
- **WHEN** 持仓本金 80000，市值 80000
- **THEN** 收益率显示 0.00%

### Requirement: 持仓内联编辑
系统 SHALL 允许用户在纪律表展开的标的列表中点击标的触发编辑 Dialog，无需跳转到账户详情页。

#### Scenario: 从纪律表编辑标的
- **WHEN** 用户在纪律表展开"股票基金"行，点击"沪深300ETF"的编辑按钮
- **THEN** 弹出编辑 Dialog，可修改名称、本金、市值、资产类别

### Requirement: 持仓币种继承账户
持仓的币种 MUST 继承其所属账户的币种，不允许单独设置。

#### Scenario: USD 账户下的持仓
- **WHEN** 用户在 USD 账户下添加持仓
- **THEN** 持仓市值输入和显示均为 USD，系统自动按汇率换算 CNY 用于汇总
