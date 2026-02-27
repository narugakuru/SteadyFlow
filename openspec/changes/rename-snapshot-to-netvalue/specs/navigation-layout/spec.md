## MODIFIED Requirements

### Requirement: 全局顶部导航栏

系统 SHALL 在所有页面顶部显示统一的导航栏，包含以下导航项：总览(/)、市场(/market)、账户(/accounts)、交易(/transactions)、净值(/netvalue)、股价更新(/batch-update)。导航栏右侧 SHALL 显示当前登录用户信息和登出按钮。admin 用户 SHALL 额外显示"管理"导航项（/admin）。

#### Scenario: 导航栏展示

- **WHEN** 已登录用户打开任意页面
- **THEN** 页面顶部显示导航栏，包含所有导航项（含"净值"指向 /netvalue），当前页面对应的导航项高亮，右侧显示用户名/头像和登出按钮

#### Scenario: 导航跳转到净值页

- **WHEN** 用户点击导航栏中的"净值"
- **THEN** 页面跳转到 /netvalue

#### Scenario: admin 用户导航栏

- **WHEN** role="admin" 的用户打开任意页面
- **THEN** 导航栏额外显示"管理"导航项，指向 /admin

#### Scenario: 普通用户导航栏

- **WHEN** role="user" 的用户打开任意页面
- **THEN** 导航栏不显示"管理"导航项

#### Scenario: 登出操作

- **WHEN** 用户点击导航栏的登出按钮
- **THEN** 系统清除 session，重定向到 /login

### Requirement: 导航栏响应式

系统 SHALL 在移动端（<768px）将导航栏改为汉堡菜单模式：左侧显示 Logo（📊 资产管理），右侧显示汉堡菜单按钮（☰），点击后弹出侧边抽屉（Sheet），内含垂直排列的所有导航项、用户信息和登出按钮。桌面端（≥768px）保持现有横向导航栏布局不变。

#### Scenario: 移动端打开导航抽屉

- **WHEN** 用户在移动端点击汉堡菜单按钮
- **THEN** 从右侧滑出抽屉面板，垂直排列所有导航项（总览、市场、账户、交易、净值、股价更新、管理），当前页面对应项高亮，底部显示用户信息和登出按钮
