## MODIFIED Requirements

### Requirement: 删除持仓
系统 SHALL 允许用户删除持仓。删除持仓不影响账户现金余额（cashBalance 是独立字段，不受持仓市值变化影响）。

#### Scenario: 删除持仓不影响现金
- **WHEN** 用户删除市值为 80000 的持仓
- **THEN** 系统删除该持仓，账户 cashBalance 保持不变，账户总价值减少 80000
