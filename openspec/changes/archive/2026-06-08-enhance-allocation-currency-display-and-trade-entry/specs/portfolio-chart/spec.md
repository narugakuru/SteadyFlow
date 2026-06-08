## MODIFIED Requirements

### Requirement: 饼状图展示资产占比

系统 SHALL 在 Dashboard 总资产区域下方展示双环饼状图。外环展示实际资产配置，内环展示目标配置。外环扇区标签 SHALL 显示类别/标的名称与百分比，且百分比固定保留两位小数。Tooltip SHALL 根据环类型使用不同格式：外环显示当前 Dashboard 货币视图下的金额（如 `¥10,000` 或 `$10,000`），内环显示百分比（如 `40.00%`）。

#### Scenario: 按大类展示饼状图

- **WHEN** 用户打开 Dashboard
- **THEN** 饼状图显示四个大类的占比，每个扇区标注类别名称和百分比

#### Scenario: 外环标签百分比保留两位小数

- **WHEN** 外环某个扇区占比为 `12.3456%`
- **THEN** 扇区标签显示为 `12.35%`

#### Scenario: 外环 Tooltip 显示当前货币视图金额

- **WHEN** 用户将 Dashboard 货币视图切换到 USD 并悬停在外环扇区上
- **THEN** Tooltip 显示该资产类别/标的的美元金额，而不是固定显示人民币

#### Scenario: 内环 Tooltip 显示百分比

- **WHEN** 用户悬停在内环（目标配置）的某个扇区上
- **THEN** Tooltip 显示该资产类别的目标百分比（如 `40.00%`），而非金额
