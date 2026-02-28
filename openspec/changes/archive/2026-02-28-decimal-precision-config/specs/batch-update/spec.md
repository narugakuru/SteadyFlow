## ADDED Requirements

### Requirement: 批量更新市值显示

股价更新页中的数值 SHALL 使用统一格式化函数显示：

- 市值：使用 `formatAmount()` 格式化
- 股价：使用 `formatPrice()` 格式化
- 份额：使用 `formatShares()` 格式化

#### Scenario: 市值整数显示

- **WHEN** 持仓市值为 50000
- **THEN** 显示为 `¥50,000`

#### Scenario: 股价小数显示

- **WHEN** 股价为 3.85
- **THEN** 显示为 `3.85`
