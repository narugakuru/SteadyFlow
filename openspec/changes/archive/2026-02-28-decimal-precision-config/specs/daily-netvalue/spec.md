## MODIFIED Requirements

### Requirement: 净值数据内容

净值页中的数值 SHALL 使用统一格式化函数：

- 总资产金额：使用 `formatAmount()` 格式化
- 各类别金额：使用 `formatAmount()` 格式化

#### Scenario: 净值总资产显示

- **WHEN** 净值记录总资产为 500000
- **THEN** 显示为 `¥500,000`

#### Scenario: 净值总资产有小数

- **WHEN** 净值记录总资产为 500000.5
- **THEN** 显示为 `¥500,000.5`
