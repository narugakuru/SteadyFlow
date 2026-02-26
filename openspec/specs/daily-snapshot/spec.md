## Requirements

### Requirement: 自动创建每日快照
系统 SHALL 在用户每天首次打开应用时自动创建当日资产快照。如果当天已有快照则不重复创建。

#### Scenario: 当天首次打开应用
- **WHEN** 用户今天第一次打开应用，数据库中无今日快照
- **THEN** 系统自动创建今日快照，记录当前资产状态

#### Scenario: 当天再次打开应用
- **WHEN** 用户今天再次打开应用，数据库中已有今日快照
- **THEN** 系统不创建新快照，使用已有数据

### Requirement: 快照数据内容
每日快照 SHALL 记录以下数据：日期、总资产(CNY)、各资产类别的实际金额(CNY)和实际占比、各账户的总价值(CNY换算，cashBalance + holdingsValue)和现金余额(CNY换算，cashBalance)、当日使用的汇率。总资产 SHALL 使用 Σ(cashBalance + holdingsValue) 的 CNY 折算计算。

#### Scenario: 快照包含完整数据
- **WHEN** 系统创建快照
- **THEN** 快照记录包含总资产（基于 cashBalance + holdingsValue 计算），各资产类别明细，以及各账户的总价值和现金余额

#### Scenario: 快照总资产反映持仓市值
- **WHEN** 账户 cashBalance=50000，持仓市值=200000
- **THEN** 快照中该账户的 totalCny 为 (50000+200000) 的 CNY 折算值，cashCny 为 50000 的 CNY 折算值

### Requirement: 手动触发快照更新
系统 SHALL 允许用户手动触发更新当日快照，用于在更新持仓数据后刷新当天的快照记录。

#### Scenario: 更新持仓后刷新快照
- **WHEN** 用户更新了持仓数据后点击"刷新快照"按钮
- **THEN** 系统用当前最新数据覆盖今日快照

### Requirement: 快照历史查询
系统 SHALL 提供快照历史列表，按日期倒序展示，每条显示：日期、总资产、各类别占比。页面顶部 SHALL 展示总资产走势折线图和资产类别占比堆叠面积图（当快照数据 >= 2 条时）。

#### Scenario: 查看历史快照
- **WHEN** 用户打开快照历史页面
- **THEN** 页面顶部显示总资产走势折线图和占比堆叠面积图，下方按日期倒序显示所有快照记录表格
