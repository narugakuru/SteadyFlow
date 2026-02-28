## Purpose

定义 asset-allocation 能力的业务约束与验收标准。

## Requirements

### Requirement: 资产类别定义

系统 SHALL 从当前用户的 `asset_classes` 表记录中动态读取资产类别列表。用户可在设置中添加、编辑自己的资产类别。现金类别为系统自动计算，不可由用户手动分配持仓。系统不再硬编码固定的资产类别枚举值。assetClasses 表 MUST 按 userId 隔离。

#### Scenario: 动态加载资产类别

- **WHEN** 系统计算当前用户的资产配置
- **THEN** 系统从 `asset_classes` 表读取该用户的所有类别（WHERE userId = currentUserId），不依赖任何硬编码枚举

#### Scenario: 新增资产类别后立即可用

- **WHEN** 用户在设置中添加了新的资产类别（如"REITS"）
- **THEN** 该类别立即出现在该用户的持仓资产类别下拉选项中，且资产配置纪律表中显示该类别的目标/实际占比

#### Scenario: 现金类别使用 cashBalance

- **WHEN** 系统计算资产配置
- **THEN** 现金类别的实际金额为当前用户各账户 cashBalance 的 CNY 折算总和

#### Scenario: 用户间资产类别独立

- **WHEN** 用户 A 添加了自定义资产类别"REITS"
- **THEN** 用户 B 的资产类别列表不受影响

### Requirement: 设置目标占比

系统 SHALL 允许用户为每个资产类别设置目标占比（百分比）。四个类别的目标占比之和 MUST 等于 100%。

#### Scenario: 设置有效的目标占比

- **WHEN** 用户设置股票基金 40%、黄金 20%、债券 25%、现金 15%
- **THEN** 系统保存配置，总和为 100%，保存成功

#### Scenario: 目标占比总和不等于 100%

- **WHEN** 用户设置的四个类别目标占比总和为 95%
- **THEN** 系统显示错误提示"目标占比总和必须为 100%"，不允许保存

### Requirement: 设置偏离阈值

系统 SHALL 提供全局共享的两级偏离阈值设置：警告阈值（黄色）和危险阈值（红色），均为百分比数值。所有资产类别共用同一套阈值，不再单独设置。

#### Scenario: 设置全局阈值

- **WHEN** 用户设置全局警告阈值 3%、危险阈值 5%
- **THEN** 所有资产类别均使用此阈值判定偏离状态

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

### Requirement: 纪律表可展开行

系统 SHALL 允许用户点击纪律表中的资产类别行来展开/收起该类别下的标的详情列表。展开后显示该类别下所有持仓标的，每个标的显示名称、所属账户、市值(CNY)、收益率、占总资产比例。

#### Scenario: 展开股票基金类别

- **WHEN** 用户点击纪律表中"股票基金"行
- **THEN** 行下方展开显示所有股票基金类持仓：沪深300(A股券商, ¥80,000, +12.5%, 20%)

#### Scenario: 展开现金类别

- **WHEN** 用户点击纪律表中"现金"行
- **THEN** 行下方展开显示各账户的现金余额明细

#### Scenario: 收起类别

- **WHEN** 用户再次点击已展开的类别行
- **THEN** 标的详情列表收起

### Requirement: 类别汇总盈亏

类别汇总盈亏 SHALL 使用 `formatAmount()` 格式化。

#### Scenario: 类别盈利

- **WHEN** 类别盈利 8600.5
- **THEN** 显示为 `+¥8,600.5`

### Requirement: 再平衡建议数据

系统 SHALL 在资产配置 API 返回数据中为每个资产类别包含 adjustAmount 字段，表示再平衡所需的调仓金额（CNY）。

#### Scenario: API 返回再平衡数据

- **WHEN** 前端请求 /api/asset-allocation
- **THEN** 每个 AllocationItem 包含 adjustAmount 字段，正值表示买入，负值表示卖出
