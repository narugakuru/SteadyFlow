## MODIFIED Requirements

### Requirement: 添加持仓

系统 SHALL 允许已登录用户在自己的账户下添加持仓，包含以下字段：持仓名称（必填）、股票代码 ticker（选填，附格式提示）、估值模式 valuationMode（必填，"amount" 或 "shares"，默认 "amount"）、所属资产类别（必填，从当前用户的 `asset_classes` 表动态获取可选值，排除"现金"类别）。shares 模式下额外显示：份额 shares（必填）、股价 price（必填），市值自动计算为 shares × price。创建持仓前 MUST 验证目标账户属于当前用户。ticker 输入框 SHALL 显示格式提示（placeholder 或 helper text），引导用户填写 Stooq 格式（如 `aapl.us`、`7203.jp`），说明填写正确格式后可自动获取报价。

#### Scenario: 资产类别下拉动态加载

- **WHEN** 用户打开添加/编辑持仓表单
- **THEN** 资产类别下拉框的选项从 `/api/asset-classes` API 动态获取（已按用户过滤），排除名称为"现金"的类别

#### Scenario: ticker 格式提示

- **WHEN** 用户在新建持仓表单中看到 ticker 输入框
- **THEN** 输入框显示 placeholder 提示如 `aapl.us / 7203.jp`，下方显示帮助文本说明格式规则（美股 `.us`、日股 `.jp`，填写后可自动获取报价）

#### Scenario: 不能在他人账户下添加持仓

- **WHEN** 用户尝试在不属于自己的账户下创建持仓
- **THEN** 系统返回 404

### Requirement: 编辑持仓

系统 SHALL 允许用户编辑持仓的名称、ticker、市值、份额、股价、成本价（cost）和所属资产类别。shares 模式下 SHALL 支持三字段联动编辑（股价、份额、市值），用户编辑任意字段时，系统根据"最后两次编辑锁定，第三个自动计算"规则联动更新。被自动计算的字段 SHALL 用视觉样式（浅色/斜体）区分。shares 模式下 SHALL 额外显示成本价（cost）和现价（price）的独立修正入口，允许用户手动修正这两个值。修改 price 时 SHALL 联动更新 marketValue = shares × price。

#### Scenario: 更新持仓市值（amount模式）

- **WHEN** 用户将 amount 模式持仓"余额宝"市值从 51000 修改为 52000
- **THEN** 系统更新市值，收益率自动更新

#### Scenario: 更新持仓股价（shares模式）

- **WHEN** 用户将 shares 模式持仓"沪深300ETF"的股价从 3.85 修改为 4.00，份额 10000 不变
- **THEN** 系统更新股价，marketValue 自动重算为 10000 × 4.00 = 40000，市值字段显示为浅色/斜体表示自动计算

#### Scenario: 编辑持仓份额（shares模式）

- **WHEN** 用户手动将持仓份额从 10000 修改为 12000，股价 3.85 不变
- **THEN** 系统更新份额，marketValue 自动重算为 12000 × 3.85 = 46200，市值字段显示为浅色/斜体

#### Scenario: 编辑持仓市值反算股价（shares模式）

- **WHEN** 用户手动将市值从 38500 修改为 40000，份额 10000 不变
- **THEN** 系统反算股价为 40000 ÷ 10000 = 4.00，股价字段显示为浅色/斜体

#### Scenario: 手动修正成本价（shares模式）

- **WHEN** 用户在编辑对话框中将成本价从 3.50 修改为 3.60
- **THEN** 系统更新 cost=3.60，总成本变为 3.60 × shares，盈亏重新计算

#### Scenario: 手动修正现价（shares模式）

- **WHEN** 用户在编辑对话框中将现价从 3.85 修改为 4.00，份额 10000
- **THEN** 系统更新 price=4.00，marketValue 重算为 10000 × 4.00 = 40000

#### Scenario: 变更持仓资产类别

- **WHEN** 用户将某持仓的资产类别从"债券"改为"股票基金"
- **THEN** 系统更新类别归属，资产配置占比自动重新计算

### Requirement: 收益率计算

系统 SHALL 自动计算每个持仓的收益率。shares 模式下：总成本 = cost × shares，盈亏 = marketValue - 总成本，收益率 = 盈亏 / 总成本 × 100%。amount 模式下：盈亏 = marketValue - cost，收益率 = 盈亏 / cost × 100%。cost 为 0 时收益率显示为 N/A。

#### Scenario: shares 模式正收益

- **WHEN** shares 模式持仓 cost=10（平均每股成本），shares=1000，price=12，marketValue=12000
- **THEN** 总成本=10000，盈亏=+2000，收益率显示 +20.00%

#### Scenario: shares 模式负收益

- **WHEN** shares 模式持仓 cost=10，shares=1000，price=8，marketValue=8000
- **THEN** 总成本=10000，盈亏=-2000，收益率显示 -20.00%

#### Scenario: amount 模式收益（不变）

- **WHEN** amount 模式持仓 cost=80000，marketValue=90000
- **THEN** 盈亏=+10000，收益率显示 +12.50%

#### Scenario: cost 为零

- **WHEN** 持仓 cost=0
- **THEN** 收益金额和收益率显示为"--"

### Requirement: 持仓列表展示

系统 SHALL 使用统一的两行布局展示持仓信息，纪律表和账户页共用同一展示格式。第一行显示核心信息：持仓名称 + 小字股票代码、市值（原始币种，非 CNY 时附带 CNY 换算）、收益金额和收益率。第二行显示详细信息：份额、成本价、现价、总仓位占比。amount 模式持仓第二行只显示占比。纪律表模式 SHALL 额外在名称后显示所属账户名标签。

#### Scenario: shares 模式持仓展示

- **WHEN** 某 shares 模式持仓 ticker="aapl.us"，份额 100，cost=150（平均每股成本），price=175，marketValue=17500
- **THEN** 第一行显示：Apple aapl.us、$17,500、+$2,500 (+16.67%)；第二行显示：份额 100 · 成本价 $150.00 · 现价 $175.00 · 占比 5.2%

#### Scenario: amount 模式持仓展示

- **WHEN** 某 amount 模式持仓 cost=¥50,000，marketValue=¥52,000
- **THEN** 第一行显示：余额宝、¥52,000、+¥2,000 (+4.00%)；第二行显示：占比 3.5%

#### Scenario: 纪律表模式显示账户名

- **WHEN** 持仓在纪律表视角下展示
- **THEN** 名称后额外显示所属账户名标签（如 [A股券商]）

#### Scenario: cost 为零的持仓

- **WHEN** 某持仓 cost 为 0
- **THEN** 收益金额和收益率显示为"--"
