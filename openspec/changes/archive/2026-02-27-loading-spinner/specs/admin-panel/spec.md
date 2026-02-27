## ADDED Requirements

### Requirement: 管理后台使用 LoadingSpinner 加载动画

管理后台页面（统计面板和用户管理）SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."。

#### Scenario: 管理后台统计页加载中

- **WHEN** 管理后台统计页正在获取统计数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

#### Scenario: 用户管理页加载中

- **WHEN** 用户管理页正在获取用户列表
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本
