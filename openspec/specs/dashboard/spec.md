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

### Requirement: 总资产区收益拆解展示

系统 SHALL 在 Dashboard 的“总资产”区域展示收益拆解信息，包含：账户总盈亏、持仓盈亏、了结盈亏。账户总盈亏 MUST 实时计算为 `持仓盈亏 + 了结盈亏`，不得作为独立持久化字段存储。

#### Scenario: 总资产区展示三项收益

- **WHEN** 用户打开 Dashboard 且总资产数据加载完成
- **THEN** 总资产区域显示账户总盈亏、持仓盈亏、了结盈亏三项指标

#### Scenario: 账户总盈亏实时计算

- **WHEN** 当前用户持仓盈亏为 `8000`，了结盈亏为 `3500`
- **THEN** 页面展示账户总盈亏为 `11500`

#### Scenario: 无交易或无持仓时显示

- **WHEN** 当前用户没有卖出交易且没有浮动盈亏
- **THEN** 三项指标均显示 `0`

### Requirement: 总资产区布局扩展

系统 SHALL 利用总资产卡片右侧空白区域承载收益拆解信息；在窄屏场景下 MUST 自动切换为纵向堆叠布局，确保三项指标完整可见。

#### Scenario: 桌面端右侧展示

- **WHEN** 视口宽度为桌面尺寸
- **THEN** 总资产金额保留在左侧，收益拆解在右侧分组展示

#### Scenario: 移动端堆叠展示

- **WHEN** 视口宽度小于移动端断点
- **THEN** 收益拆解切换为纵向堆叠，不出现内容裁切或重叠

### Requirement: Dashboard 总览支持临时货币视图

系统 SHALL 在 Dashboard 中维护一个仅当前页面有效的临时货币视图状态，用于驱动总资产卡片、纪律表、资产分布图 tooltip 与再平衡建议的金额展示。该状态默认值 MUST 为“默认”，并在每次重新进入网站时恢复为默认，不得写入数据库或本地存储。

#### Scenario: 首次进入页面默认使用默认视图

- **WHEN** 用户首次进入 Dashboard
- **THEN** 货币视图默认为“默认”，总资产卡片金额显示为 CNY，纪律表持仓明细保持原币显示

#### Scenario: 切换币种仅影响当前页面会话

- **WHEN** 用户将货币视图切换到 USD 后刷新页面或重新进入网站
- **THEN** Dashboard 再次恢复为“默认”视图，而不是保留上一次的 USD 选择

### Requirement: 资产配置纪律表

系统 SHALL 在 Dashboard 中显示资产配置纪律表，包含列：资产类别、实际占比（含进度条可视化）/ 目标占比、实际金额（默认 CNY 或当前选定货币）、持仓盈亏（金额 + 收益率）和警告状态。非现金类别显示汇总持仓盈亏金额及颜色标识，现金类别持仓盈亏列显示"--"。纪律表上方 SHALL 展示偏离度水平柱状图。纪律表展开的持仓列表 SHALL 使用统一的 HoldingRow 格式展示，并提供交易和编辑操作按钮。编辑弹窗 SHALL 区分 amount/shares 估值模式，shares 模式使用三字段联动编辑。

#### Scenario: 纪律表完整展示含持仓盈亏

- **WHEN** 用户已配置目标占比且有持仓数据
- **THEN** 纪律表显示所有资产类别的完整数据行，每行包含实际（含进度条和目标标记线）/ 目标、金额、持仓盈亏和状态；纪律表上方显示偏离度柱状图

#### Scenario: 现金类别持仓盈亏显示

- **WHEN** 纪律表展示现金类别
- **THEN** 持仓盈亏列显示"--"

#### Scenario: 纪律表展开持仓使用统一格式

- **WHEN** 用户展开某资产类别查看持仓
- **THEN** 持仓使用统一的两行布局展示（名称+代码+账户名、市值、收益；份额/均价/股价/占比），默认视图下外币持仓仅显示原币市值；每个持仓提供交易和编辑按钮

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

系统 SHALL 在 Dashboard header 区域保留标题，并在右侧提供“货币视图”下拉框与「更新股价」按钮；下拉框 MUST 放置在「更新股价」按钮左侧，并基于当前账户币种动态列出“默认 + 账户里存在的币种”。系统 MUST 不显示「记录净值」手动按钮。点击「更新股价」后调用 `POST /api/holdings/fetch-prices` 的手动模式，显示加载状态，完成后展示逐条结果明细弹窗并刷新页面数据。完整数据导出入口 MUST 放置在设置面板中，而不是 Dashboard header。

#### Scenario: Dashboard header 布局

- **WHEN** 用户打开 Dashboard
- **THEN** header 区域显示标题、货币视图下拉框和「更新股价」按钮，不显示「记录净值」按钮，也不显示完整数据导出按钮

#### Scenario: 货币视图下拉列出账户币种

- **WHEN** 当前用户账户包含 CNY、USD 与 HKD 三种币种
- **THEN** Dashboard header 的下拉框显示“默认、人民币、美元、港币”四个选项

#### Scenario: 点击手动更新股价

- **WHEN** 用户在 Dashboard 点击「更新股价」按钮
- **THEN** 按钮显示加载状态，调用手动模式报价同步接口，完成后弹出逐条明细结果并刷新页面资产数据

### Requirement: Dashboard 股价更新时间提示

系统 SHALL 在总资产卡片区域展示一个不显眼的股价更新时间提示，用于表达最近一次成功报价同步时间。该提示 MUST 与前端查询缓存时间区分，不得复用纯前端 `DataFreshness` 语义。

#### Scenario: 展示最近成功同步时间

- **WHEN** 当前用户存在最近一次成功报价同步记录
- **THEN** 总资产卡片显示“股价更新：<最近成功时间或相对时间>”的弱提示

#### Scenario: 尚无成功同步记录

- **WHEN** 当前用户从未成功同步过股价
- **THEN** 总资产卡片显示“股价更新：暂未成功同步”或等效弱提示文案

### Requirement: Dashboard 静默报价兜底刷新

Dashboard 在数据加载完成后 SHALL 判断股价数据是否超过陈旧阈值；若已超过阈值且当前不存在进行中的报价同步，则页面 MUST 自动触发一次静默报价刷新。静默刷新 MUST 不弹出逐条结果明细弹窗，但完成后 MUST 刷新页面资产数据与股价更新时间提示。

#### Scenario: 进入 Dashboard 时数据已过期

- **WHEN** 用户打开 Dashboard，且最近一次成功报价同步已超过系统设定的陈旧阈值
- **THEN** 页面自动触发一次静默报价刷新，不弹出结果弹窗，并在完成后刷新资产数据与股价更新时间提示

#### Scenario: 进入 Dashboard 时数据仍新鲜

- **WHEN** 用户打开 Dashboard，且最近一次成功报价同步尚未超过陈旧阈值
- **THEN** 页面不触发静默报价刷新

#### Scenario: 已有进行中的报价同步

- **WHEN** 用户打开 Dashboard 时系统判断已有进行中的报价同步
- **THEN** 页面不再重复发起第二次静默报价刷新

### Requirement: Dashboard 持仓精简导出按钮

系统 SHALL 在 Dashboard 的“资产配置纪律”标题区域提供“导出持仓”按钮。该按钮 MUST 复用 Dashboard“更新股价”一致的主按钮配色。点击后 MUST 下载精简决策快照，仅包含总资产盈亏摘要、各类资产占比和非零市值标的持仓。

#### Scenario: 资产配置纪律区域显示按钮

- **WHEN** 用户打开 Dashboard
- **THEN** “资产配置纪律”标题区域显示“导出持仓”按钮，且按钮样式与“更新股价”保持一致

#### Scenario: 点击导出持仓

- **WHEN** 用户点击“导出持仓”按钮
- **THEN** 系统下载精简决策快照，不包含 `raw` 与 `accountBreakdown`

### Requirement: Dashboard 纪律区快捷交易按钮

系统 SHALL 在 Dashboard 的“资产配置纪律”标题区域提供一个“交易”按钮，并将其放置在“导出持仓”按钮左侧。点击后 MUST 打开通用交易弹窗，默认交易类型为买入，且默认不选择账户与持仓。

#### Scenario: 纪律区显示交易按钮

- **WHEN** 用户打开 Dashboard
- **THEN** “资产配置纪律”标题区域显示“交易”按钮，位置在“导出持仓”按钮左侧

#### Scenario: 点击交易按钮打开空上下文表单

- **WHEN** 用户点击 Dashboard 纪律区的“交易”按钮
- **THEN** 系统打开交易弹窗，默认类型为“买入”，账户选择器与持仓选择器均保持为空，等待用户手动选择
