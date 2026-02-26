## MODIFIED Requirements

### Requirement: 添加持仓

系统 SHALL 允许已登录用户在自己的账户下添加持仓，包含以下字段：持仓名称（必填）、股票代码 ticker（选填）、估值模式 valuationMode（必填，"amount" 或 "shares"，默认 "amount"）、本金/成本（必填，数值类型，使用账户的币种）、市值（必填，数值类型，使用账户的币种，默认等于本金）、所属资产类别（必填，从当前用户的 `asset_classes` 表动态获取可选值，排除"现金"类别）。shares 模式下额外显示：份额 shares（必填）、股价 price（必填），市值自动计算为 shares × price。创建持仓前 MUST 验证目标账户属于当前用户。

#### Scenario: 资产类别下拉动态加载

- **WHEN** 用户打开添加/编辑持仓表单
- **THEN** 资产类别下拉框的选项从 `/api/asset-classes` API 动态获取（已按用户过滤），排除名称为"现金"的类别

#### Scenario: 使用动态类别创建持仓

- **WHEN** 用户选择一个动态加载的资产类别（如用户自定义的"REITS"）并保存持仓
- **THEN** 系统将该类别名称存入 holdings 表的 `asset_class` 列

#### Scenario: 不能在他人账户下添加持仓

- **WHEN** 用户尝试在不属于自己的账户下创建持仓
- **THEN** 系统返回 404

### Requirement: 删除持仓

系统 SHALL 允许已登录用户删除自己账户下的持仓。删除持仓不影响账户现金余额。MUST 验证持仓所属账户属于当前用户。

#### Scenario: 删除持仓不影响现金

- **WHEN** 用户删除市值为 80000 的持仓
- **THEN** 系统删除该持仓，账户 cashBalance 保持不变，账户总价值减少 80000

#### Scenario: 不能删除他人持仓

- **WHEN** 用户尝试删除不属于自己账户的持仓
- **THEN** 系统返回 404
