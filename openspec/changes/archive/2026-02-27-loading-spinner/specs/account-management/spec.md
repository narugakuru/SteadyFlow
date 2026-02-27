## ADDED Requirements

### Requirement: 账户管理页使用 LoadingSpinner 加载动画

账户管理页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，包括 Suspense fallback。

#### Scenario: 账户页加载中

- **WHEN** 账户管理页正在获取账户和资产配置数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

#### Scenario: 账户页 Suspense fallback

- **WHEN** 账户页 Suspense 边界等待异步内容
- **THEN** fallback 显示 LoadingSpinner 组件
