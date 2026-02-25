## Requirements

### Requirement: 全局顶部导航栏
系统 SHALL 在所有页面顶部显示统一的导航栏，包含以下导航项：总览(/)、账户(/accounts)、交易(/transactions)、快照(/snapshots)、股价更新(/batch-update)。

#### Scenario: 导航栏展示
- **WHEN** 用户打开任意页面
- **THEN** 页面顶部显示导航栏，包含所有导航项，当前页面对应的导航项高亮

#### Scenario: 导航跳转
- **WHEN** 用户点击导航栏中的"交易"
- **THEN** 页面跳转到 /transactions

### Requirement: 配置入口
系统 SHALL 在导航栏中提供配置入口（⚙️图标），点击后弹出配置弹窗，不跳转页面。

#### Scenario: 打开配置弹窗
- **WHEN** 用户点击导航栏中的⚙️图标
- **THEN** 弹出资产类别配置弹窗，不发生页面跳转

### Requirement: 导航栏响应式
系统 SHALL 确保导航栏在不同屏幕宽度下正常显示。

#### Scenario: 正常宽度显示
- **WHEN** 屏幕宽度足够
- **THEN** 导航栏水平排列所有导航项
