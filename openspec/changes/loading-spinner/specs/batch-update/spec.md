## ADDED Requirements

### Requirement: 股价更新页使用 LoadingSpinner 加载动画

股价更新页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."。

#### Scenario: 股价更新页加载中

- **WHEN** 股价更新页正在获取账户和持仓数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本
