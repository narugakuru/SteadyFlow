## MODIFIED Requirements

### Requirement: 自动创建每日快照
系统 SHALL 在已登录用户每天首次打开应用时自动创建当日资产快照。如果当天该用户已有快照则不重复创建。快照 MUST 绑定当前用户 ID。snapshots 表的唯一约束改为 (userId, date) 联合唯一。

#### Scenario: 当天首次打开应用
- **WHEN** 用户今天第一次打开应用，数据库中无该用户今日快照
- **THEN** 系统自动创建今日快照，记录当前用户的资产状态，userId=当前用户ID

#### Scenario: 当天再次打开应用
- **WHEN** 用户今天再次打开应用，数据库中已有该用户今日快照
- **THEN** 系统不创建新快照，使用已有数据

#### Scenario: 不同用户同日快照独立
- **WHEN** 用户 A 和用户 B 在同一天各自打开应用
- **THEN** 系统分别为两个用户创建独立的快照记录

### Requirement: 快照数据内容
每日快照 SHALL 记录当前用户的以下数据：日期、总资产(CNY)、各资产类别的实际金额(CNY)和实际占比、各账户的总价值(CNY换算，cashBalance + holdingsValue)和现金余额(CNY换算，cashBalance)、当日使用的汇率。总资产 SHALL 使用当前用户 Σ(cashBalance + holdingsValue) 的 CNY 折算计算。

#### Scenario: 快照包含完整数据
- **WHEN** 系统创建快照
- **THEN** 快照记录包含当前用户的总资产（基于 cashBalance + holdingsValue 计算），各资产类别明细，以及各账户的总价值和现金余额

#### Scenario: 快照总资产反映持仓市值
- **WHEN** 当前用户账户 cashBalance=50000，持仓市值=200000
- **THEN** 快照中该账户的 totalCny 为 (50000+200000) 的 CNY 折算值，cashCny 为 50000 的 CNY 折算值

### Requirement: 快照历史查询
系统 SHALL 提供当前用户的快照历史列表，按日期倒序展示，每条显示：日期、总资产、各类别占比。页面顶部 SHALL 展示总资产走势折线图和资产类别占比堆叠面积图（当快照数据 >= 2 条时）。

#### Scenario: 查看历史快照
- **WHEN** 已登录用户打开快照历史页面
- **THEN** 页面顶部显示总资产走势折线图和占比堆叠面积图，下方按日期倒序显示当前用户的所有快照记录表格，不显示其他用户的快照
