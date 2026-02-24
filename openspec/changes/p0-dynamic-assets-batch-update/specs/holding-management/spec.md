## MODIFIED Requirements

### Requirement: 添加持仓
系统 SHALL 允许用户在指定账户下添加持仓，包含以下字段：持仓名称（必填）、市值（必填，数值类型，使用账户的币种）、所属资产类别（必填，从 `asset_classes` 表动态获取可选值，排除"现金"类别）。

#### Scenario: 资产类别下拉动态加载
- **WHEN** 用户打开添加/编辑持仓表单
- **THEN** 资产类别下拉框的选项从 `/api/asset-classes` API 动态获取，排除名称为"现金"的类别

#### Scenario: 使用动态类别创建持仓
- **WHEN** 用户选择一个动态加载的资产类别（如用户自定义的"REITS"）并保存持仓
- **THEN** 系统将该类别名称存入 holdings 表的 `asset_class` 列

### Requirement: 持仓资产类别校验
系统 SHALL 在创建或更新持仓时校验所选资产类别存在于 `asset_classes` 表中（排除"现金"）。

#### Scenario: 提交不存在的资产类别
- **WHEN** API 收到的 `assetClass` 值不存在于 `asset_classes` 表中
- **THEN** 系统返回 400 错误，提示"无效的资产类别"
