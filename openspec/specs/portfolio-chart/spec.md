## Requirements

### Requirement: Dashboard 默认不展示资产分布饼图

系统 SHALL 不再在 Dashboard/总览默认布局中展示资产分布饼图。资产配置纪律表与再平衡建议仍保留在总览；组合占比分析迁移到洞察页能力承载。

#### Scenario: 总览不显示旧饼图

- **WHEN** 用户打开 Dashboard/总览
- **THEN** 页面默认不显示按大类或按标的的资产分布饼图

#### Scenario: 总览保留纪律视图

- **WHEN** 用户需要查看资产类别偏离与调仓建议
- **THEN** 用户在总览页继续通过资产配置纪律表与再平衡建议查看

### Requirement: 资产分布可视化迁移到洞察

系统 SHALL 将货币占比、账户占比与资产类别占比作为洞察页的当前快照图表展示。旧 `PortfolioChart` 组件 MAY 作为未引用代码暂时保留，但不得作为 Dashboard 默认布局的一部分恢复。

#### Scenario: 洞察承载占比分析

- **WHEN** 用户需要查看组合占比
- **THEN** 用户进入 `/insights` 查看货币、账户与资产类别占比图表

#### Scenario: 旧组件不参与总览渲染

- **WHEN** Dashboard/总览渲染
- **THEN** 旧资产分布饼图组件不参与默认页面结构
