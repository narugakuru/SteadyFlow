## MODIFIED Requirements

### Requirement: 图表数值格式化

图表中的 tooltip 和 label 数值 SHALL 使用统一格式化函数：

- 金额类 tooltip：使用 `formatAmount()` 格式化，并带当前 Dashboard 货币视图对应的货币符号
- 百分比类 tooltip：使用 `formatPercent()` 格式化
- 饼图外环标签中的百分比：使用 `formatPercent()` 格式化，固定显示两位小数

#### Scenario: 饼图 tooltip 金额

- **WHEN** 鼠标悬停饼图区域，当前 Dashboard 货币视图为 USD，且该区域金额为 130400 对应的美元投影
- **THEN** tooltip 显示为 `$...` 且金额部分经过 `formatAmount()` 格式化

#### Scenario: 饼图标签百分比

- **WHEN** 饼图某个标签的占比为 `8.1`
- **THEN** 标签显示 `8.10%`

#### Scenario: 折线图 tooltip 金额

- **WHEN** 鼠标悬停净值折线图数据点，总资产为 500000.5
- **THEN** tooltip 显示 `¥500,000.5`
