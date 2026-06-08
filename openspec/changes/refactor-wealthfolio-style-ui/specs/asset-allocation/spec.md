## ADDED Requirements

### Requirement: amount 模式资产配置与洞察口径

系统 SHALL 在资产配置、纪律表、总览与洞察读模型中统一支持 amount 模式持仓。amount 模式持仓的当前市值 MUST 使用 `marketValue`，总成本 MUST 使用 `cost`，收益金额 MUST 使用 `marketValue - cost`，收益率 MUST 使用 `(marketValue - cost) / cost`；系统 MUST NOT 对 amount 模式使用 `shares * price` 作为市值来源。

#### Scenario: amount 模式市值参与资产配置

- **WHEN** 用户有 amount 模式持仓 `marketValue=52000` 且资产类别为“债券”
- **THEN** 资产配置与洞察页将 52000 计入“债券”的当前实际金额

#### Scenario: amount 模式收益率

- **WHEN** amount 模式持仓 `cost=50000` 且 `marketValue=52000`
- **THEN** 系统计算该持仓当前收益率为约 `4%`

#### Scenario: amount 模式不依赖 shares 和 price

- **WHEN** amount 模式持仓的 `shares=0` 且 `price=0`
- **THEN** 系统仍使用 `marketValue` 和 `cost` 计算资产配置、纪律与洞察数据
