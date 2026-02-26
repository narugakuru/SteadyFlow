## MODIFIED Requirements

### Requirement: 全局顶部导航栏

系统 SHALL 在所有页面顶部显示统一的导航栏，包含以下导航项：总览(/)、账户(/accounts)、交易(/transactions)、快照(/snapshots)、股价更新(/batch-update)。导航栏右侧 SHALL 显示当前登录用户信息和登出按钮。admin 用户 SHALL 额外显示"管理"导航项（/admin）。

#### Scenario: 导航栏展示

- **WHEN** 已登录用户打开任意页面
- **THEN** 页面顶部显示导航栏，包含所有导航项，当前页面对应的导航项高亮，右侧显示用户名/头像和登出按钮

#### Scenario: admin 用户导航栏

- **WHEN** role="admin" 的用户打开任意页面
- **THEN** 导航栏额外显示"管理"导航项，指向 /admin

#### Scenario: 普通用户导航栏

- **WHEN** role="user" 的用户打开任意页面
- **THEN** 导航栏不显示"管理"导航项

#### Scenario: 登出操作

- **WHEN** 用户点击导航栏的登出按钮
- **THEN** 系统清除 session，重定向到 /login

### Requirement: 配置入口

系统 SHALL 在导航栏中提供配置入口（⚙️图标），点击后弹出配置弹窗，不跳转页面。

#### Scenario: 打开配置弹窗

- **WHEN** 用户点击导航栏中的⚙️图标
- **THEN** 弹出资产类别配置弹窗，显示当前用户的资产类别配置，不跳转页面
