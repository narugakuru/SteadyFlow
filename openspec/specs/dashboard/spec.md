## Purpose

定义 dashboard 能力的业务约束与验收标准。

## Requirements

### Requirement: 总资产概览

总览页中的数值 SHALL 使用统一格式化函数：

- 总资产金额：使用 `formatAmount()` 格式化
- 各类别金额：使用 `formatAmount()` 格式化
- 百分比：使用 `formatPercent()` 格式化

#### Scenario: 总资产整数

- **WHEN** 总资产为 272000
- **THEN** 显示为 `¥272,000`

#### Scenario: 总资产有小数

- **WHEN** 总资产为 272000.5
- **THEN** 显示为 `¥272,000.5`

### Requirement: 资产配置纪律表

系统 SHALL 在 Dashboard 中显示资产配置纪律表，包含列：资产类别、实际占比（含进度条可视化）/ 目标占比、实际金额(CNY)、持仓盈亏(CNY)、警告状态。非现金类别显示汇总持仓盈亏金额及颜色标识，现金类别持仓盈亏列显示"--"。纪律表上方 SHALL 展示偏离度水平柱状图。纪律表展开的持仓列表 SHALL 使用统一的 HoldingRow 格式展示，并提供交易和编辑操作按钮。编辑弹窗 SHALL 区分 amount/shares 估值模式，shares 模式使用三字段联动编辑。

#### Scenario: 纪律表完整展示含持仓盈亏

- **WHEN** 用户已配置目标占比且有持仓数据
- **THEN** 纪律表显示所有资产类别的完整数据行，每行包含实际（含进度条和目标标记线）/ 目标、金额、持仓盈亏和状态；纪律表上方显示偏离度柱状图

#### Scenario: 现金类别持仓盈亏显示

- **WHEN** 纪律表展示现金类别
- **THEN** 持仓盈亏列显示"--"

#### Scenario: 纪律表展开持仓使用统一格式

- **WHEN** 用户展开某资产类别查看持仓
- **THEN** 持仓使用统一的两行布局展示（名称+代码+账户名、市值、收益；份额/均价/股价/占比），每个持仓提供交易和编辑按钮

#### Scenario: 纪律表持仓交易

- **WHEN** 用户在纪律表点击某持仓的"交易"按钮
- **THEN** 弹出 TransactionForm，自动预填该持仓所属账户和持仓信息

#### Scenario: 纪律表编辑 shares 模式持仓

- **WHEN** 用户在纪律表展开某资产类别，点击 shares 模式持仓的编辑按钮
- **THEN** 弹出编辑 Dialog，显示股价/份额/市值三字段联动编辑，用户改任意字段，系统根据"最后两次编辑锁定"规则自动计算第三个字段

#### Scenario: 纪律表编辑 amount 模式持仓

- **WHEN** 用户在纪律表展开某资产类别，点击 amount 模式持仓的编辑按钮
- **THEN** 弹出编辑 Dialog，显示名称、市值、资产类别字段

### Requirement: Dashboard 布局

系统 SHALL 调整 Dashboard 布局为：总资产卡片 + 饼状图 + 配置纪律表（含可展开的类别详情）+ 再平衡建议。所有数据 MUST 限定为当前用户的数据。

#### Scenario: Dashboard 默认展示

- **WHEN** 已登录用户打开 Dashboard（/）
- **THEN** 页面从上到下依次显示：当前用户的总资产卡片、饼状图（按大类）、纪律表（含偏离度柱状图）、再平衡建议。不显示账户列表。不显示其他用户的数据

### Requirement: Dashboard 缓存优先展示与条件刷新

Dashboard 页面 SHALL 使用全局客户端缓存层读取资产配置数据，并遵循统一时效策略：`staleTime=60s`、`persistTime=3d`。在持久化失效前，缓存数据 MUST 优先展示给用户。

#### Scenario: Dashboard 60秒内命中缓存

- **WHEN** 用户进入 Dashboard 且命中缓存，缓存年龄小于或等于 60 秒
- **THEN** 页面立即展示缓存数据，且不触发异步远端刷新

#### Scenario: Dashboard 60秒后命中缓存

- **WHEN** 用户进入 Dashboard 且命中缓存，缓存年龄大于 60 秒且小于 3 天
- **THEN** 页面先展示缓存数据，再异步请求远端数据并更新页面数值

#### Scenario: Dashboard 持久化缓存过期

- **WHEN** 用户进入 Dashboard 且缓存年龄大于或等于 3 天
- **THEN** 页面不使用过期缓存作为命中数据，按远端请求流程加载

### Requirement: Dashboard 后台刷新失败提示

Dashboard 在已展示缓存数据的前提下，若后台刷新失败 SHALL 显示全局失败通知条，通知条 MUST 自动缓慢淡出消失，且页面保持当前可用数据。

#### Scenario: Dashboard 异步刷新失败

- **WHEN** Dashboard 已展示缓存数据且后台请求失败
- **THEN** 显示“更新数据失败”通知条，随后自动缓慢消失，并继续保留当前缓存展示

### Requirement: Dashboard 使用 LoadingSpinner 加载动画

Dashboard 页面 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，但仅在“无可用缓存且远端数据尚未返回”时展示全页加载动画。

#### Scenario: Dashboard 无缓存时加载中

- **WHEN** Dashboard 页面正在获取资产配置数据，且本地无可用缓存
- **THEN** 页面显示 LoadingSpinner 组件（带"加载中..."文字），替代原有纯文本

#### Scenario: Dashboard 有缓存时进入页面

- **WHEN** Dashboard 页面存在未过 `persistTime` 的本地缓存
- **THEN** 页面优先显示缓存数据，不进入全页 LoadingSpinner 阶段

### Requirement: Dashboard 导航

系统 SHALL 在 Dashboard header 区域保留标题，并在右侧仅提供「自动获取报价」按钮；系统 MUST 移除「记录净值」手动按钮。点击「自动获取报价」后调用 `POST /api/holdings/fetch-prices`，显示加载状态，完成后展示更新结果摘要 toast，并刷新页面数据。净值刷新由自动触发链路处理，不再由 Dashboard 手动操作承担。

#### Scenario: Dashboard header 布局

- **WHEN** 用户打开 Dashboard
- **THEN** header 区域显示标题和「自动获取报价」按钮，不显示「记录净值」按钮

#### Scenario: 点击自动获取报价

- **WHEN** 用户在 Dashboard 点击「自动获取报价」按钮
- **THEN** 按钮显示加载状态，调用 `POST /api/holdings/fetch-prices`，完成后显示 toast 提示更新结果摘要（成功 N 个、失败 N 个、跳过 N 个），页面资产数据自动刷新

#### Scenario: 无可更新持仓

- **WHEN** 用户没有任何可自动更新报价的 shares 模式持仓
- **THEN** toast 提示“没有可自动更新的持仓”
