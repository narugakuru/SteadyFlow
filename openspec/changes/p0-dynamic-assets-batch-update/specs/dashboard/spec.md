## MODIFIED Requirements

### Requirement: 资产类别视角展示
系统 SHALL 在资产类别视角中动态展示所有资产类别，颜色从预定义颜色数组中按顺序循环分配，不再使用硬编码的类别-颜色映射。

#### Scenario: 动态颜色分配
- **WHEN** 系统渲染资产类别视角或持仓列表中的类别标签
- **THEN** 每个资产类别的颜色从预定义数组（8-10 种）中按 `asset_classes` 表顺序循环分配

#### Scenario: 新增类别自动获得颜色
- **WHEN** 用户添加了第 9 个资产类别
- **THEN** 该类别的颜色从预定义数组的第 1 个颜色重新开始循环

### Requirement: Dashboard 导航增加批量更新入口
系统 SHALL 在 Dashboard header 区域增加"批量更新"导航按钮。

#### Scenario: 点击批量更新按钮
- **WHEN** 用户点击 Dashboard header 中的"批量更新"按钮
- **THEN** 系统导航到 `/batch-update` 页面
