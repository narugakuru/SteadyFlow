## Purpose

定义 holding-management 能力的业务约束与验收标准。

## Requirements

### Requirement: 添加持仓

系统 SHALL 允许已登录用户在自己的账户下添加持仓，包含以下字段：持仓名称（必填）、股票代码 ticker（选填，附格式提示）、估值模式 valuationMode（必填，"amount" 或 "shares"，默认 "amount"）、所属资产类别（必填，从当前用户的 `asset_classes` 表动态获取可选值，排除"现金"类别）。shares 模式下额外显示：份额 shares（必填）、股价 price（必填），市值自动计算为 shares × price。创建持仓前 MUST 验证目标账户属于当前用户。ticker 输入框 SHALL 显示格式提示（placeholder 或 helper text），引导用户填写正确格式（美股 `aapl.us`、日股 `7203.jp`、A 股 `600519.SS`/`000001.SZ`、港股 `0700.HK`），说明填写正确格式后可自动获取报价。

#### Scenario: 资产类别下拉动态加载

- **WHEN** 用户打开添加/编辑持仓表单
- **THEN** 资产类别下拉框的选项从 `/api/asset-classes` API 动态获取（已按用户过滤），排除名称为"现金"的类别

#### Scenario: ticker 格式提示

- **WHEN** 用户在新建持仓表单中看到 ticker 输入框
- **THEN** 输入框显示 placeholder 提示如 `aapl.us / 600519.SS`，下方显示帮助文本说明格式规则（美股 `.us`、日股 `.jp`、A 股 `.SS`/`.SZ`、港股 `.HK`，填写后可自动获取报价）

#### Scenario: 不能在他人账户下添加持仓

- **WHEN** 用户尝试在不属于自己的账户下创建持仓
- **THEN** 系统返回 404

### Requirement: 持仓资产类别校验

系统 SHALL 在创建或更新持仓时校验所选资产类别存在于 `asset_classes` 表中（排除"现金"）。

#### Scenario: 提交不存在的资产类别

- **WHEN** API 收到的 `assetClass` 值不存在于 `asset_classes` 表中
- **THEN** 系统返回 400 错误，提示"无效的资产类别"

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

### Requirement: 删除持仓

系统 SHALL 允许已登录用户删除自己账户下的持仓。删除持仓不影响账户现金余额。MUST 验证持仓所属账户属于当前用户。

#### Scenario: 删除持仓不影响现金

- **WHEN** 用户删除市值为 80000 的持仓
- **THEN** 系统删除该持仓，账户 cashBalance 保持不变，账户总价值减少 80000

#### Scenario: 不能删除他人持仓

- **WHEN** 用户尝试删除不属于自己账户的持仓
- **THEN** 系统返回 404

### Requirement: 持仓列表展示

持仓行中的数值 SHALL 使用统一格式化函数显示：

- 市值：使用 `formatAmount()` 格式化
- 盈亏金额：使用 `formatAmount()` 格式化
- 收益率：使用 `formatPercent()` 格式化
- 均价/股价：使用 `formatPrice()` 格式化（最多3位小数）
- 份额：使用 `formatShares()` 格式化（整数不显示小数点，有小数最多4位）
- 占比：使用 `formatPercent()` 格式化

**shares 模式示例**：

- 第一行：`¥38,500`、`+¥3,500 (+10%)`
- 第二行：`份额 10,000 · 均价 ¥3.5 · 股价 ¥3.85 · 占比 5.2%`

**amount 模式示例**：

- 第一行：`¥52,000`、`+¥2,000 (+4%)`
- 第二行：`占比 3.5%`

#### Scenario: shares 模式整数份额

- **WHEN** 持仓份额为 10000，股价为 3.85
- **THEN** 份额显示为 `10,000`（不显示小数点），股价显示为 `3.85`

#### Scenario: shares 模式小数份额

- **WHEN** 持仓份额为 1234.5678，均价为 3.5
- **THEN** 份额显示为 `1,234.5678`，均价显示为 `3.5`

#### Scenario: 收益率整数

- **WHEN** 收益率计算结果为 10.00%
- **THEN** 显示为 `10%`（去除尾部零）

### Requirement: 持仓操作按钮

系统 SHALL 为持仓提供标准化的操作按钮，根据使用场景分为两种模式：精简模式（纪律表）提供交易和编辑两个按钮；完整模式（账户页）提供交易、编辑、交易记录和删除四个按钮。

#### Scenario: 纪律表持仓操作（精简模式）

- **WHEN** 用户在纪律表展开某资产类别查看持仓
- **THEN** 每个持仓显示"交易"和"编辑"两个操作按钮

#### Scenario: 账户页持仓操作（完整模式）

- **WHEN** 用户在账户页展开某账户查看持仓
- **THEN** 每个持仓显示"交易"、"编辑"、"交易记录 →"和"删除"四个操作按钮

#### Scenario: 交易按钮弹出交易表单

- **WHEN** 用户点击持仓的"交易"按钮
- **THEN** 弹出 TransactionForm，自动预填当前账户和持仓

#### Scenario: 编辑按钮弹出编辑弹窗

- **WHEN** 用户点击持仓的"编辑"按钮
- **THEN** 弹出 HoldingEditDialog，根据估值模式显示对应编辑界面

### Requirement: 收益率计算

收益率 SHALL 使用 `formatPercent()` 格式化显示，整数不显示小数点，有小数最多2位并去除尾部零。

#### Scenario: 正收益带小数

- **WHEN** 收益率为 12.5%
- **THEN** 显示为 `+12.5%`（绿色）

#### Scenario: 负收益整数

- **WHEN** 收益率为 -10%
- **THEN** 显示为 `-10%`（红色）

#### Scenario: 零收益

- **WHEN** 收益率为 0%
- **THEN** 显示为 `0%`

### Requirement: 持仓内联编辑

系统 SHALL 允许用户在纪律表展开的标的列表中点击标的触发编辑 Dialog，无需跳转到账户详情页。编辑 Dialog SHALL 区分 amount/shares 估值模式：amount 模式显示名称、市值、资产类别；shares 模式显示名称、股价/份额/市值三字段联动编辑、资产类别。本金由交易记录自动累积，不在编辑弹窗中手动修改。

#### Scenario: 从纪律表编辑 amount 模式标的

- **WHEN** 用户在纪律表展开某行，点击 amount 模式持仓的编辑按钮
- **THEN** 弹出编辑 Dialog，显示名称、市值、资产类别字段

#### Scenario: 从纪律表编辑 shares 模式标的

- **WHEN** 用户在纪律表展开某行，点击 shares 模式持仓的编辑按钮
- **THEN** 弹出编辑 Dialog，显示名称、股价/份额/市值三字段联动编辑、资产类别字段

### Requirement: 持仓币种继承账户

持仓的币种 MUST 继承其所属账户的币种，不允许单独设置。

#### Scenario: USD 账户下的持仓

- **WHEN** 用户在 USD 账户下添加持仓
- **THEN** 持仓市值输入和显示均为 USD，系统自动按汇率换算 CNY 用于汇总
