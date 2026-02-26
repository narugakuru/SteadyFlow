## MODIFIED Requirements

### Requirement: 饼状图展示资产占比
系统 SHALL 在 Dashboard 总资产区域下方展示双环饼状图。外环展示实际资产配置，内环展示目标配置。Tooltip SHALL 根据环类型使用不同格式：外环显示金额（如 `¥10,000`），内环显示百分比（如 `40%`）。

#### Scenario: 按大类展示饼状图
- **WHEN** 用户打开 Dashboard
- **THEN** 饼状图显示四个大类的占比，每个扇区标注类别名称和百分比

#### Scenario: 外环 Tooltip 显示金额
- **WHEN** 用户悬停在外环（实际配置）的某个扇区上
- **THEN** Tooltip 显示该资产类别/标的的金额值（如 `¥10,000`）

#### Scenario: 内环 Tooltip 显示百分比
- **WHEN** 用户悬停在内环（目标配置）的某个扇区上
- **THEN** Tooltip 显示该资产类别的目标百分比（如 `40%`），而非金额
