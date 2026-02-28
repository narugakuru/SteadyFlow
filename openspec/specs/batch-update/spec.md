## Purpose

定义 batch-update 能力的业务约束与验收标准。

## Requirements

### Requirement: 股价更新页使用 LoadingSpinner 加载动画

股价更新页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."。

#### Scenario: 股价更新页加载中

- **WHEN** 股价更新页正在获取账户和持仓数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本

### Requirement: 批量更新页面

系统 SHALL 提供独立的批量更新页面（`/batch-update`），在一个页面内展示当前用户的所有账户及其持仓，支持 inline 编辑持仓市值/股价。页面顶部 SHALL 提供「自动获取报价」按钮，点击后调用 `POST /api/holdings/fetch-prices` 自动更新有 Stooq 格式 ticker 的 shares 模式持仓价格。页面在移动端（<768px）SHALL 使用稳定的单列优先布局，避免输入区、操作区与列表发生重叠、截断或超出屏幕的问题。

#### Scenario: 查看批量更新页面

- **WHEN** 已登录用户访问 `/batch-update` 页面
- **THEN** 系统展示当前用户的所有账户，每个账户下列出其所有持仓，每个持仓显示名称、资产类别、当前市值（可编辑输入框）。页面顶部显示「自动获取报价」按钮。不显示其他用户的数据

#### Scenario: 点击自动获取报价

- **WHEN** 用户在 batch-update 页面点击「自动获取报价」按钮
- **THEN** 按钮显示加载状态，调用 API 完成后显示 toast 提示更新结果摘要（成功 N 个、失败 N 个、跳过 N 个），页面持仓数据自动刷新

#### Scenario: 编辑持仓市值

- **WHEN** 用户修改某个持仓的市值输入框
- **THEN** 该输入框标记为"已修改"状态（视觉区分），保存按钮变为可用

#### Scenario: 一键保存所有变更

- **WHEN** 用户点击"保存所有变更"按钮
- **THEN** 系统验证所有被修改的持仓属于当前用户，将修改通过 API 请求提交，成功后刷新页面数据并清除"已修改"标记

#### Scenario: 账户总价值自动更新

- **WHEN** 用户修改了某账户下持仓的市值并保存
- **THEN** 该账户的总价值（cashBalance + holdingsValue）自动重新计算并刷新显示

#### Scenario: 移动端布局稳定可操作

- **WHEN** 用户在移动端访问批量更新页面并执行编辑/保存
- **THEN** 列表、输入框与操作按钮以单列或分段形式完整展示，无横向溢出、无内容重叠，主要操作在不缩放情况下可点击

### Requirement: 批量更新市值显示

股价更新页中的数值 SHALL 使用统一格式化函数显示：

- 市值：使用 `formatAmount()` 格式化
- 股价：使用 `formatPrice()` 格式化
- 份额：使用 `formatShares()` 格式化

#### Scenario: 市值整数显示

- **WHEN** 持仓市值为 50000
- **THEN** 显示为 `¥50,000`

#### Scenario: 股价小数显示

- **WHEN** 股价为 3.85
- **THEN** 显示为 `3.85`
