## MODIFIED Requirements

### Requirement: 全局顶部导航栏

系统 SHALL 在所有页面顶部显示统一的导航栏，包含以下导航项：总览(/)、市场(/market)、账户(/accounts)、交易(/transactions)、快照(/snapshots)、股价更新(/batch-update)。

#### Scenario: 导航栏展示

- **WHEN** 用户打开任意页面
- **THEN** 页面顶部显示导航栏，包含所有导航项（含"市场"），当前页面对应的导航项高亮

#### Scenario: 导航跳转到市场页

- **WHEN** 用户点击导航栏中的"市场"
- **THEN** 页面跳转到 /market
