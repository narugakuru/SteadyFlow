## MODIFIED Requirements

### Requirement: 图表数值格式化

图表中的 tooltip 和 label 数值 SHALL 使用统一格式化函数：

- 金额类 tooltip：使用 `formatAmount()` 格式化
- 百分比类 tooltip：使用 `formatPercent()` 格式化

#### Scenario: 饼图 tooltip 金额

- **WHEN** 鼠标悬停饼图区域，该区域金额为 130400
- **THEN** tooltip 显示 `¥130,400`

#### Scenario: 折线图 tooltip 金额

- **WHEN** 鼠标悬停净值折线图数据点，总资产为 500000.5
- **THEN** tooltip 显示 `¥500,000.5`
