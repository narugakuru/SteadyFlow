## MODIFIED Requirements

### Requirement: 总资产概览

总览页中的数值 SHALL 使用统一格式化函数：

- 总资产金额：使用 `formatAmount()` 格式化
- 各类别金额：使用 `formatAmount()` 格式化
- 百分比：使用 `formatPercent()` 格式化

#### Scenario: 总资产整数

- **WHEN** 总资产为 272000
- **THEN** 显示为 `¥272,000`

#### Scenario: 总资产有小数

- **WHEN** 总资产为 272000.5
- **THEN** 显示为 `¥272,000.5`
