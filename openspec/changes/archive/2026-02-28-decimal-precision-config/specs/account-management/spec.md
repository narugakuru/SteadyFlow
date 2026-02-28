## MODIFIED Requirements

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

### Requirement: 账户盈亏计算

账户持仓盈亏 SHALL 使用 `formatAmount()` 格式化显示金额部分。

#### Scenario: 账户持仓盈利

- **WHEN** 账户持仓盈利 15000
- **THEN** 显示为 `+¥15,000`

#### Scenario: 账户持仓亏损

- **WHEN** 账户持仓亏损 20000.5
- **THEN** 显示为 `-¥20,000.5`
