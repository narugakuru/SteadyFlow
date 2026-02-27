## ADDED Requirements

### Requirement: 按市场分 Tab 图表展示

系统 SHALL 在市场页下方提供按市场分组的 Tab 图表区域，包含 A股、美股、港股、日股、波动率五个 Tab，每个 Tab 嵌入 TradingView Advanced Chart Widget 展示该市场的主要指数图表。

#### Scenario: Tab 默认展示

- **WHEN** 用户打开市场页
- **THEN** 图表区域默认显示第一个 Tab（A股），嵌入 TradingView Advanced Chart Widget 展示上证指数（SSE:000001）

#### Scenario: 切换市场 Tab

- **WHEN** 用户点击不同的市场 Tab（如"美股"）
- **THEN** 图表区域切换为该市场的 TradingView Advanced Chart Widget，默认展示该市场最重要的指数（美股默认 FOREXCOM:SPXUSD）

### Requirement: Tab 内指数切换

系统 SHALL 在每个市场 Tab 内提供指数切换功能，允许用户在同一市场的多个指数间切换图表。

#### Scenario: 切换同市场指数

- **WHEN** 用户在 A股 Tab 内点击"沪深300"
- **THEN** 图表切换为沪深300（SSE:000300）的 TradingView Advanced Chart

#### Scenario: 单指数市场无切换

- **WHEN** 用户查看波动率 Tab
- **THEN** 仅展示 VIX（CBOE:VIX）图表，无指数切换按钮

### Requirement: TradingView Widget 不可用时的兜底

系统 SHALL 在 TradingView Widget 无法加载特定指数时，显示提示信息和跳转链接。

#### Scenario: Widget 加载失败兜底

- **WHEN** TradingView Widget 无法展示某个指数（如 symbol 不支持）
- **THEN** 显示"该指数暂不支持图表展示"提示，并提供"在 TradingView 查看"的跳转链接

### Requirement: 深色主题配置

系统 SHALL 将所有 TradingView Widget 配置为深色主题（colorTheme: "dark"）。

#### Scenario: Widget 主题

- **WHEN** 市场页加载 TradingView Advanced Chart Widget
- **THEN** Widget 使用深色主题渲染

### Requirement: VIX 情绪参考与图表整合

系统 SHALL 在波动率 Tab 的图表下方展示 VIX 情绪阈值参考组件。

#### Scenario: 波动率 Tab 展示情绪参考

- **WHEN** 用户切换到波动率 Tab
- **THEN** 图表下方显示 VIX 情绪阈值参考（5 级情绪：市场平静/正常波动/波动加剧/市场恐慌/极度恐慌），当前 VIX 值对应的级别高亮
