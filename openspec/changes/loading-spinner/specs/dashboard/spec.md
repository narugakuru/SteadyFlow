## ADDED Requirements

### Requirement: Dashboard 使用 LoadingSpinner 加载动画

Dashboard 页面 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."。

#### Scenario: Dashboard 加载中

- **WHEN** Dashboard 页面正在获取资产配置数据
- **THEN** 页面显示 LoadingSpinner 组件（带"加载中..."文字），替代原有纯文本
