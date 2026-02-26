## MODIFIED Requirements

### Requirement: 资产类别定义

系统 SHALL 从当前用户的 `asset_classes` 表记录中动态读取资产类别列表。用户可在设置中添加、编辑自己的资产类别。现金类别为系统自动计算，不可由用户手动分配持仓。系统不再硬编码固定的资产类别枚举值。assetClasses 表 MUST 按 userId 隔离。

#### Scenario: 动态加载资产类别

- **WHEN** 系统计算当前用户的资产配置
- **THEN** 系统从 `asset_classes` 表读取该用户的所有类别（WHERE userId = currentUserId），不依赖任何硬编码枚举

#### Scenario: 新增资产类别后立即可用

- **WHEN** 用户在设置中添加了新的资产类别（如"REITS"）
- **THEN** 该类别立即出现在该用户的持仓资产类别下拉选项中，且资产配置纪律表中显示该类别的目标/实际占比

#### Scenario: 现金类别使用 cashBalance

- **WHEN** 系统计算资产配置
- **THEN** 现金类别的实际金额为当前用户各账户 cashBalance 的 CNY 折算总和

#### Scenario: 用户间资产类别独立

- **WHEN** 用户 A 添加了自定义资产类别"REITS"
- **THEN** 用户 B 的资产类别列表不受影响

### Requirement: 实际占比计算

系统 SHALL 自动计算当前用户每个资产类别的实际占比。计算公式：类别实际金额(CNY) = Σ 该用户该类别所有持仓市值(CNY)；现金实际金额(CNY) = Σ 该用户各账户 cashBalance(CNY)；总资产 = Σ 该用户各账户 (cashBalance + holdingsValue) 的 CNY 折算；类别实际占比 = 类别实际金额 / 总资产。

#### Scenario: 计算含多币种的实际占比

- **WHEN** 当前用户股票基金类别下有 ¥80,000 的 A 股持仓和 $7,000 的美股持仓，汇率 USD/CNY = 7.2，总资产为 ¥400,000
- **THEN** 股票基金实际金额 = 80000 + 7000×7.2 = ¥130,400，实际占比 = 32.6%

#### Scenario: 总资产计算包含现金和持仓

- **WHEN** 当前用户账户A cashBalance=50000(CNY)，持仓市值=150000(CNY)；账户B cashBalance=5000(USD)，持仓市值=10000(USD)，汇率 USD/CNY=7.2
- **THEN** 总资产 = (50000+150000) + (5000+10000)×7.2 = 200000 + 108000 = ¥308,000
