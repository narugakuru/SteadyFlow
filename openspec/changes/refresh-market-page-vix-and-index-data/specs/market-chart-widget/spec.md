## ADDED Requirements

### Requirement: 免费 VIX 图表组件渲染

系统 SHALL 在市场页最上方使用项目内嵌的免费图表组件展示 VIX 日线走势，不再依赖 TradingView 嵌入脚本。图表 MUST 使用市场聚合接口返回的标准化时间序列渲染，并提供加载中与无数据兜底状态。

#### Scenario: VIX 图表正常渲染

- **WHEN** 用户打开市场页且 VIX 时间序列返回成功
- **THEN** 页面顶部显示 VIX 图表，并使用接口返回的日期与收盘值渲染折线或面积走势

#### Scenario: VIX 图表无数据兜底

- **WHEN** 用户打开市场页但 VIX 时间序列为空
- **THEN** 页面顶部仍保留 VIX 区域，并显示“暂无可用 VIX 数据”之类的占位提示，而不是加载 TradingView 或空白容器

## MODIFIED Requirements

### Requirement: VIX 情绪参考与图表整合

系统 SHALL 在市场页最上方将 VIX 图表与情绪参考整合为同一区域展示。情绪参考 MUST 沿用现有 5 档阈值口径（`<15`、`15-20`、`20-30`、`30-40`、`>40`），但界面仅显示当前 VIX 数值所在区间对应的一条简洁说明，不再同时展开全部区间卡片。

#### Scenario: 当前区间说明展示

- **WHEN** 用户打开市场页且存在最新可用的 VIX 数值
- **THEN** 页面在 VIX 图表下方显示当前区间名称、数值范围和对应说明，并高亮该区间的情绪状态

#### Scenario: 缺少当前 VIX 数值时的说明兜底

- **WHEN** 用户打开市场页但无法获取最新可用的 VIX 数值
- **THEN** 页面仍显示 VIX 说明组件，并提示当前区间暂不可判定，而不是渲染全部 5 档说明卡片

## REMOVED Requirements

### Requirement: 按市场分 Tab 图表展示

**Reason**: 市场页不再内嵌 TradingView，也不再提供按市场切换的图表区域。

**Migration**: 改为在市场页顶部展示单一的 VIX 免费图表；其他市场仅保留指数快照表格和外部查看链接。

### Requirement: Tab 内指数切换

**Reason**: 图表区域已从多市场 Tab 切换改为固定的顶部 VIX 图表，不再需要页内指数切换按钮。

**Migration**: 需要查看其他指数走势时，使用指数表格中的外部查看链接。

### Requirement: TradingView Widget 不可用时的兜底

**Reason**: 页面内不再加载 TradingView Widget，该兜底场景已失效。

**Migration**: 统一改为免费 VIX 图表组件的无数据占位提示。

### Requirement: 深色主题配置

**Reason**: TradingView Widget 主题配置随嵌入方案一并移除。

**Migration**: 新的 VIX 图表样式由项目自身组件和主题变量控制。
