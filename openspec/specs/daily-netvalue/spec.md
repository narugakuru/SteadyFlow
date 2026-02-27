## Requirements

### Requirement: 自动创建每日净值

系统 SHALL 在已登录用户每天首次打开应用时自动创建当日资产净值记录。如果当天该用户已有净值记录则不重复创建。净值 MUST 绑定当前用户 ID。netvalue 表的唯一约束为 (userId, date) 联合唯一。

#### Scenario: 当天首次打开应用

- **WHEN** 用户今天第一次打开应用，数据库中无该用户今日净值记录
- **THEN** 系统自动创建今日净值记录，记录当前用户的资产状态，userId=当前用户ID

#### Scenario: 当天再次打开应用

- **WHEN** 用户今天再次打开应用，数据库中已有该用户今日净值记录
- **THEN** 系统不创建新记录，使用已有数据

#### Scenario: 不同用户同日净值独立

- **WHEN** 用户 A 和用户 B 在同一天各自打开应用
- **THEN** 系统分别为两个用户创建独立的净值记录

### Requirement: 净值数据内容

每日净值 SHALL 记录当前用户的以下数据：日期、总资产(CNY)、各资产类别的实际金额(CNY)和实际占比、各账户的总价值(CNY换算，cashBalance + holdingsValue)和现金余额(CNY换算，cashBalance)、当日使用的汇率。总资产 SHALL 使用当前用户 Σ(cashBalance + holdingsValue) 的 CNY 折算计算。

#### Scenario: 净值包含完整数据

- **WHEN** 系统创建净值记录
- **THEN** 记录包含当前用户的总资产（基于 cashBalance + holdingsValue 计算），各资产类别明细，以及各账户的总价值和现金余额

#### Scenario: 净值总资产反映持仓市值

- **WHEN** 当前用户账户 cashBalance=50000，持仓市值=200000
- **THEN** 净值记录中该账户的 totalCny 为 (50000+200000) 的 CNY 折算值，cashCny 为 50000 的 CNY 折算值

### Requirement: 手动触发净值更新

系统 SHALL 允许用户手动触发更新当日净值，用于在更新持仓数据后刷新当天的净值记录。

#### Scenario: 更新持仓后刷新净值

- **WHEN** 用户更新了持仓数据后点击"刷新净值"按钮
- **THEN** 系统用当前最新数据覆盖今日净值记录

### Requirement: 净值历史查询

系统 SHALL 提供当前用户的净值历史列表，按日期倒序展示，每条显示：日期、总资产、各类别占比。页面顶部 SHALL 展示总资产走势折线图和资产类别占比堆叠面积图（当净值数据 >= 2 条时）。页面路由为 `/netvalue`，API 路由为 `/api/netvalue`，数据库表名为 `netvalue`。

#### Scenario: 查看历史净值

- **WHEN** 已登录用户打开净值历史页面（/netvalue）
- **THEN** 页面顶部显示总资产走势折线图和占比堆叠面积图，下方按日期倒序显示当前用户的所有净值记录表格，不显示其他用户的记录
