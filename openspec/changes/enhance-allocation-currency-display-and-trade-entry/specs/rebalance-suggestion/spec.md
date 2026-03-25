## ADDED Requirements

### Requirement: 再平衡建议跟随 Dashboard 临时货币视图

系统 SHALL 让 Dashboard 再平衡建议模块中的建议金额跟随当前临时货币视图实时投影。默认视图下继续显示 CNY；切换到指定币种后，建议买入/卖出金额 MUST 统一显示为该目标币种，且不得改写数据库中的资产价格或调仓基准。

#### Scenario: 默认视图显示人民币建议金额

- **WHEN** 用户保持 Dashboard 货币视图为“默认”
- **THEN** 再平衡建议继续显示“建议买入/卖出 ¥X”

#### Scenario: 美元视图显示美元建议金额

- **WHEN** 用户将 Dashboard 货币视图切换到 USD
- **THEN** 再平衡建议统一显示“建议买入/卖出 $X”，金额由现有原币资产和汇率实时换算得到
