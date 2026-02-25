## MODIFIED Requirements

### Requirement: Dashboard 布局
系统 SHALL 调整 Dashboard 布局为：总资产卡片 + 饼状图 + 配置纪律表（含可展开的类别详情）+ 再平衡建议。移除账户列表（已迁移到独立的 /accounts 页面）。

#### Scenario: Dashboard 默认展示
- **WHEN** 用户打开 Dashboard（/）
- **THEN** 页面从上到下依次显示：总资产卡片、饼状图（按大类）、纪律表（含偏离度柱状图）、再平衡建议。不显示账户列表。

### Requirement: Dashboard 导航增加批量更新入口
系统 SHALL 移除 Dashboard header 区域的导航按钮（批量更新、快照历史等），这些入口已迁移到全局导航栏。Dashboard header 只保留标题和刷新快照按钮。

#### Scenario: Dashboard header 简化
- **WHEN** 用户打开 Dashboard
- **THEN** header 区域只显示标题"📊 资产组合管理"和刷新快照按钮，不再显示批量更新、快照历史等导航按钮

## REMOVED Requirements

### Requirement: 账户列表展示
**Reason**: 账户列表已迁移到独立的 /accounts 页面，不再在 Dashboard 中展示。
**Migration**: 用户通过全局导航栏的"账户"入口访问账户列表。

### Requirement: 持仓详情返回按钮位置
**Reason**: 持仓详情已迁移到 /accounts 页面，不再在 Dashboard 中展示。
**Migration**: 在 /accounts 页面中保留相同的返回交互。
