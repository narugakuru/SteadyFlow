## ADDED Requirements

### Requirement: 市场概览页使用 LoadingSpinner 加载动画

市场概览页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."。

#### Scenario: 市场页加载中

- **WHEN** 市场概览页通过 useFetch 获取市场指数数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本
