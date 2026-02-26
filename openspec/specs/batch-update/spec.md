## Requirements

### Requirement: 批量更新页面
系统 SHALL 提供独立的批量更新页面（`/batch-update`），在一个页面内展示所有账户及其持仓，支持 inline 编辑持仓市值/股价。不再提供账户总额编辑功能。

#### Scenario: 查看批量更新页面
- **WHEN** 用户访问 `/batch-update` 页面
- **THEN** 系统展示所有账户，每个账户下列出其所有持仓，每个持仓显示名称、资产类别、当前市值（可编辑输入框）。账户行显示账户名称、币种、总价值（cashBalance + holdingsValue，只读）和现金余额（只读）

#### Scenario: 编辑持仓市值
- **WHEN** 用户修改某个持仓的市值输入框
- **THEN** 该输入框标记为"已修改"状态（视觉区分），保存按钮变为可用

#### Scenario: 一键保存所有变更
- **WHEN** 用户点击"保存所有变更"按钮
- **THEN** 系统将所有修改过的持仓市值通过 API 请求提交，在一个数据库事务中完成更新，成功后刷新页面数据并清除"已修改"标记

#### Scenario: 无修改时保存按钮禁用
- **WHEN** 页面加载后用户未做任何修改
- **THEN** "保存所有变更"按钮处于禁用状态

#### Scenario: 账户总价值自动更新
- **WHEN** 用户修改了某账户下持仓的市值并保存
- **THEN** 该账户的总价值（cashBalance + holdingsValue）自动重新计算并刷新显示

#### Scenario: 从 Dashboard 导航
- **WHEN** 用户在 Dashboard header 点击"批量更新"按钮
- **THEN** 系统导航到 `/batch-update` 页面
