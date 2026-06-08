## ADDED Requirements

### Requirement: 洞察页入口与访问控制

系统 SHALL 提供 `/insights` 洞察页，作为当前用户投资组合可视化分析入口。洞察页 MUST 只读取当前登录用户的数据，并在全局左侧边栏中以“洞察”导航项展示。

#### Scenario: 打开洞察页

- **WHEN** 已登录用户点击左侧边栏“洞察”
- **THEN** 系统跳转到 `/insights` 并展示当前用户的投资组合洞察数据

#### Scenario: 未登录访问洞察页

- **WHEN** 未登录用户访问 `/insights`
- **THEN** 系统按现有认证保护规则重定向到登录页或返回未授权状态

#### Scenario: 用户数据隔离

- **WHEN** 用户 A 打开洞察页
- **THEN** 页面仅展示用户 A 的账户、持仓、资产类别、汇率与设置数据，不展示其他用户数据

### Requirement: 洞察页组合占比图表

洞察页 SHALL 展示三个组合占比图表：货币占比、账户占比、资产类别占比。所有占比 MUST 以统一基准货币折算后的当前总资产为分母。图表 MUST 使用当前快照数据，不要求历史数据。

#### Scenario: 展示货币占比

- **WHEN** 当前用户存在 CNY、USD、HKD 多币种账户
- **THEN** 洞察页展示每种货币对应的当前资产占比，百分比基于折算后的总资产计算

#### Scenario: 展示账户占比

- **WHEN** 当前用户存在多个账户
- **THEN** 洞察页展示每个账户的当前资产占比，账户资产按现金加持仓市值并折算到统一基准后计算

#### Scenario: 展示资产类别占比

- **WHEN** 当前用户存在资产类别配置与持仓
- **THEN** 洞察页展示每个资产类别的当前实际占比，并与资产配置纪律表使用一致的数据口径

#### Scenario: 无数据兜底

- **WHEN** 当前用户没有账户或总资产为 0
- **THEN** 洞察页显示空状态，不渲染误导性的 0% 或 NaN 图表

### Requirement: 当前持仓热力图

洞察页 SHALL 展示当前持仓热力图。热力图块面积 MUST 基于当前持仓市值折算值；颜色 MUST 基于当前持仓盈亏比例，并遵守用户 `colorMode` 设置。热力图只表示当前持仓当前盈亏状态，不表示历史表现或每日变化。

#### Scenario: 热力图面积按市值划分

- **WHEN** 持仓 A 折算市值为 ¥100,000，持仓 B 折算市值为 ¥50,000
- **THEN** 热力图中持仓 A 的面积大约为持仓 B 的两倍

#### Scenario: 热力图颜色按盈亏比例划分

- **WHEN** 某持仓当前收益率为正，且用户 `colorMode=us`
- **THEN** 该热力图块使用正收益颜色显示

#### Scenario: 国内颜色模式

- **WHEN** 某持仓当前收益率为正，且用户 `colorMode=cn`
- **THEN** 该热力图块使用 A 股习惯的正收益颜色显示

#### Scenario: 热力图标签

- **WHEN** 某持仓热力图块有足够展示空间
- **THEN** 块内显示持仓名称或 ticker，以及当前盈亏比例

#### Scenario: 小块标签兜底

- **WHEN** 某持仓热力图块面积过小，不足以完整显示文字
- **THEN** 系统隐藏或压缩块内标签，但仍可通过 Tooltip 或详情展示名称、市值与盈亏比例

### Requirement: amount 模式持仓洞察口径

洞察页 SHALL 将 `valuationMode="amount"` 持仓作为一等持仓类型处理。amount 模式持仓的市值 MUST 使用 `marketValue`，成本 MUST 使用 `cost`，盈亏比例 MUST 基于 `(marketValue - cost) / cost` 计算；系统 MUST NOT 要求 amount 模式持仓存在 shares、price 或可报价 ticker。

#### Scenario: amount 模式基金进入热力图

- **WHEN** 用户持有 amount 模式的支付宝基金，`marketValue=52000`，`cost=50000`
- **THEN** 洞察页热力图使用 52000 作为面积基准，并显示约 `+4%` 当前盈亏比例

#### Scenario: amount 模式无 ticker

- **WHEN** amount 模式持仓没有 ticker
- **THEN** 洞察页仍展示该持仓，不因缺少股票代码或股价而隐藏

#### Scenario: cost 为 0 的 amount 模式

- **WHEN** amount 模式持仓 `cost=0`
- **THEN** 洞察页显示该持仓市值，但盈亏比例显示为 `--`

### Requirement: 洞察数据服务端聚合

系统 SHALL 在服务端提供洞察页所需的当前快照读模型，复用现有账户、持仓、资产配置、汇率与用户设置口径。前端 MUST NOT 在多个接口结果之间重复实现核心币种折算、P&L 或资产类别汇总逻辑。

#### Scenario: 洞察接口返回当前快照

- **WHEN** 洞察页请求数据
- **THEN** 服务端返回当前用户的汇总、货币占比、账户占比、资产类别占比和热力图持仓数据

#### Scenario: 不新增历史表

- **WHEN** 实现洞察页
- **THEN** 系统不需要新增历史行情、历史盈亏或性能快照表即可满足当前洞察需求
