## MODIFIED Requirements

### Requirement: 实际占比计算

纪律表中的数值 SHALL 使用统一格式化函数显示：

- 占比：使用 `formatPercent()` 格式化
- 金额：使用 `formatAmount()` 格式化
- 偏离度：使用 `formatPercent()` 格式化

#### Scenario: 占比显示

- **WHEN** 实际占比为 32.6%
- **THEN** 显示为 `32.6%`

#### Scenario: 金额显示

- **WHEN** 实际金额为 130400
- **THEN** 显示为 `¥130,400`

### Requirement: 偏离度警告显示

偏离度和盈亏金额 SHALL 使用统一格式化函数显示。

#### Scenario: 偏离度整数

- **WHEN** 偏离度为 4%
- **THEN** 显示为 `⚠️ 超配 +4%`

#### Scenario: 盈亏金额

- **WHEN** 盈亏为 8600
- **THEN** 显示为 `+¥8,600`

### Requirement: 类别汇总盈亏

类别汇总盈亏 SHALL 使用 `formatAmount()` 格式化。

#### Scenario: 类别盈利

- **WHEN** 类别盈利 8600.5
- **THEN** 显示为 `+¥8,600.5`
