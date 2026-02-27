## ADDED Requirements

### Requirement: 净值历史页使用 LoadingSpinner 加载动画

净值历史页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."。

#### Scenario: 净值页加载中

- **WHEN** 净值历史页通过 useFetch 获取净值数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本
