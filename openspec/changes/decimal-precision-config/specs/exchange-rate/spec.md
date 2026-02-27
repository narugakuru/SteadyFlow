## MODIFIED Requirements

### Requirement: 汇率用于金额换算

汇率换算结果 SHALL 使用 `roundForStorage()` 截断到存储精度（最多4位小数），显示时使用 `formatAmount()` 格式化。汇率本身的显示保持 `formatRate()` 固定4位小数不变。

#### Scenario: 换算结果显示

- **WHEN** USD 账户 $10,000 按 USD/CNY=7.2345 换算
- **THEN** 换算结果存储为 `72345`，显示为 `¥72,345`

#### Scenario: 汇率显示不变

- **WHEN** 显示 USD/CNY 汇率 7.2
- **THEN** 显示为 `7.2000`（固定4位小数）
