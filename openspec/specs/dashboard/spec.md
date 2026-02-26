## Requirements

### Requirement: 总资产概览
系统 SHALL 在 Dashboard 顶部显示总资产金额（CNY），总资产 = Σ 各账户总额按汇率换算为 CNY。

#### Scenario: 多币种总资产汇总
- **WHEN** 用户有 CNY 账户总额 200000、USD 账户总额 10000（汇率 7.2）
- **THEN** Dashboard 显示总资产 ¥272,000

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
系统 SHALL 调整 Dashboard 布局为：总资产卡片 + 饼状图 + 配置纪律表（含可展开的类别详情）+ 再平衡建议。移除账户列表（已迁移到独立的 /accounts 页面）。

#### Scenario: Dashboard 默认展示
- **WHEN** 用户打开 Dashboard（/）
- **THEN** 页面从上到下依次显示：总资产卡片、饼状图（按大类）、纪律表（含偏离度柱状图）、再平衡建议。不显示账户列表。

### Requirement: 资产类别视角展示
系统 SHALL 在资产类别视角中动态展示所有资产类别，颜色从预定义颜色数组中按顺序循环分配，不再使用硬编码的类别-颜色映射。

#### Scenario: 动态颜色分配
- **WHEN** 系统渲染资产类别视角或持仓列表中的类别标签
- **THEN** 每个资产类别的颜色从预定义数组（8-10 种）中按 `asset_classes` 表顺序循环分配

#### Scenario: 新增类别自动获得颜色
- **WHEN** 用户添加了第 9 个资产类别
- **THEN** 该类别的颜色从预定义数组的第 1 个颜色重新开始循环

### Requirement: Dashboard 导航
系统 SHALL 移除 Dashboard header 区域的导航按钮（批量更新、快照历史等），这些入口已迁移到全局导航栏。Dashboard header 只保留标题和刷新快照按钮。

#### Scenario: Dashboard header 简化
- **WHEN** 用户打开 Dashboard
- **THEN** header 区域只显示标题和刷新快照按钮，不再显示批量更新、快照历史等导航按钮
