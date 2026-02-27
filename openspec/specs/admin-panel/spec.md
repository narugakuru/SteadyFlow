## Requirements

### Requirement: 管理后台入口

系统 SHALL 为 admin 用户提供管理后台入口 /admin，仅 role="admin" 的用户可访问。非 admin 用户访问时返回 403 或重定向到首页。

#### Scenario: admin 访问管理后台

- **WHEN** role="admin" 的用户访问 /admin
- **THEN** 系统显示管理后台面板，包含用户管理和基础统计入口

#### Scenario: 普通用户访问管理后台

- **WHEN** role="user" 的用户访问 /admin
- **THEN** 系统重定向到首页

### Requirement: 用户管理页面

系统 SHALL 在 /admin/users 提供用户管理页面，展示所有注册用户列表，支持修改用户角色。

#### Scenario: 用户列表展示

- **WHEN** admin 访问 /admin/users
- **THEN** 页面展示所有用户列表，每行显示：用户名、邮箱、角色（admin/user）、计划（free/pro）、注册时间、登录方式（密码/GitHub）

#### Scenario: 修改用户角色

- **WHEN** admin 将某用户的角色从 "user" 改为 "admin"
- **THEN** 系统更新该用户的 role 字段，该用户下次登录后 JWT 中的 role 更新

#### Scenario: 修改用户计划

- **WHEN** admin 将某用户的计划从 "free" 改为 "pro"
- **THEN** 系统更新该用户的 plan 字段

#### Scenario: 不能修改自己的角色

- **WHEN** admin 尝试将自己的角色从 "admin" 改为 "user"
- **THEN** 系统拒绝操作，提示"不能修改自己的角色"

### Requirement: 管理后台统计

系统 SHALL 在 /admin 面板展示基础统计信息。

#### Scenario: 统计数据展示

- **WHEN** admin 访问 /admin
- **THEN** 页面显示：总用户数、今日新增用户数、各角色用户数、各计划用户数

### Requirement: 管理后台使用 LoadingSpinner 加载动画

管理后台页面（统计面板和用户管理）SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."。

#### Scenario: 管理后台统计页加载中

- **WHEN** 管理后台统计页正在获取统计数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

#### Scenario: 用户管理页加载中

- **WHEN** 用户管理页正在获取用户列表
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本
