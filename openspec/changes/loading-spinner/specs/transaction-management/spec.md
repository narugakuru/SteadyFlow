## ADDED Requirements

### Requirement: 交易记录页使用 LoadingSpinner 加载动画

交易记录页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，包括 Suspense fallback。

#### Scenario: 交易页加载中

- **WHEN** 交易记录页正在获取交易、账户、持仓数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

#### Scenario: 交易页 Suspense fallback

- **WHEN** 交易页 Suspense 边界等待异步内容
- **THEN** fallback 显示 LoadingSpinner 组件
