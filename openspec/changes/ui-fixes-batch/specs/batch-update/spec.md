## MODIFIED Requirements

### Requirement: 批量更新页面
系统 SHALL 提供独立的批量更新页面（`/batch-update`），在一个页面内展示所有账户及其持仓，支持 inline 编辑持仓市值/股价。不再提供账户总额编辑功能。对于 shares 模式持仓，SHALL 显示市值、股数、股价三个字段，其中市值和股价可编辑，编辑其中一个时自动计算另一个（股数固定）。

#### Scenario: 查看批量更新页面
- **WHEN** 用户访问 `/batch-update` 页面
- **THEN** 系统展示所有账户，每个账户下列出其所有持仓。amount 模式持仓显示名称、资产类别、当前市值（可编辑输入框）。shares 模式持仓显示名称、资产类别、市值（可编辑）、股数（只读）、股价（可编辑）。账户行显示账户名称、币种、总价值（只读）和现金余额（只读）

#### Scenario: 编辑 amount 模式持仓市值
- **WHEN** 用户修改某个 amount 模式持仓的市值输入框
- **THEN** 该输入框标记为"已修改"状态（视觉区分），保存按钮变为可用

#### Scenario: 编辑 shares 模式持仓股价
- **WHEN** 用户修改某个 shares 模式持仓的股价输入框，该持仓股数为 1000
- **THEN** 市值输入框自动更新为 股数 × 新股价，两个字段均标记为"已修改"状态

#### Scenario: 编辑 shares 模式持仓市值
- **WHEN** 用户修改某个 shares 模式持仓的市值输入框，该持仓股数为 1000
- **THEN** 股价输入框自动更新为 新市值 / 股数，两个字段均标记为"已修改"状态

#### Scenario: shares 模式股数为零时股价禁用
- **WHEN** 某 shares 模式持仓的股数为 0
- **THEN** 股价输入框禁用（无法通过股价反算市值），用户只能直接编辑市值

#### Scenario: 一键保存所有变更
- **WHEN** 用户点击"保存所有变更"按钮
- **THEN** 系统将所有修改过的持仓数据（marketValue 及 shares 模式的 price）通过 API 请求提交，成功后刷新页面数据并清除"已修改"标记

#### Scenario: 无修改时保存按钮禁用
- **WHEN** 页面加载后用户未做任何修改
- **THEN** "保存所有变更"按钮处于禁用状态

#### Scenario: 账户总价值自动更新
- **WHEN** 用户修改了某账户下持仓的市值并保存
- **THEN** 该账户的总价值（cashBalance + holdingsValue）自动重新计算并刷新显示

#### Scenario: 从 Dashboard 导航
- **WHEN** 用户在 Dashboard header 点击"批量更新"按钮
- **THEN** 系统导航到 `/batch-update` 页面
