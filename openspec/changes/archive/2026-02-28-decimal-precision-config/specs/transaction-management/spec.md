## ADDED Requirements

### Requirement: 交易记录数值显示

交易记录列表和表单中的数值 SHALL 使用统一格式化函数：

- 交易金额：使用 `formatAmount()` 格式化
- 交易价格：使用 `formatPrice()` 格式化
- 交易份额：使用 `formatShares()` 格式化
- 手续费：使用 `formatAmount()` 格式化

#### Scenario: 交易金额显示

- **WHEN** 交易金额为 15000
- **THEN** 显示为 `¥15,000`

#### Scenario: 交易价格显示

- **WHEN** 交易价格为 3.141
- **THEN** 显示为 `3.141`
