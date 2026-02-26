## MODIFIED Requirements

### Requirement: 快照数据内容
每日快照 SHALL 记录以下数据：日期、总资产(CNY)、各资产类别的实际金额(CNY)和实际占比、各账户的总价值(CNY换算，cashBalance + holdingsValue)和现金余额(CNY换算，cashBalance)、当日使用的汇率。总资产 SHALL 使用 Σ(cashBalance + holdingsValue) 的 CNY 折算计算。

#### Scenario: 快照包含完整数据
- **WHEN** 系统创建快照
- **THEN** 快照记录包含总资产（基于 cashBalance + holdingsValue 计算），各资产类别明细，以及各账户的总价值和现金余额

#### Scenario: 快照总资产反映持仓市值
- **WHEN** 账户 cashBalance=50000，持仓市值=200000
- **THEN** 快照中该账户的 totalCny 为 (50000+200000) 的 CNY 折算值，cashCny 为 50000 的 CNY 折算值
