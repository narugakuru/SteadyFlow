## Requirements

### Requirement: 指数行情表格展示

系统 SHALL 在市场页上方以静态骨架模式展示全球主要指数表格，按市场分组（美股、A股、港股、日股、波动率）。表格结构（指数名称、TradingView 跳转链接）始终显示，不依赖 API 数据。价格、涨跌、涨跌幅列通过 yahoo-finance2 API 动态填充，API 失败时显示 `--`。

#### Scenario: 正常数据展示

- **WHEN** 用户打开市场页且 API 返回数据成功
- **THEN** 表格显示所有指数的名称、最新价、涨跌、涨跌幅、更新时间，每行末尾有 TradingView 跳转链接图标

#### Scenario: API 失败时的兜底展示

- **WHEN** 用户打开市场页且 API 请求失败
- **THEN** 表格仍显示所有指数名称和 TradingView 跳转链接，价格/涨跌/涨跌幅列显示 `--`，更新时间列显示 `-`

#### Scenario: 加载中状态

- **WHEN** 用户打开市场页且数据正在加载
- **THEN** 表格骨架正常显示，价格列显示加载占位符动画

### Requirement: 数据获取使用 yahoo-finance2

系统 SHALL 使用 `yahoo-finance2` npm 包（v3）作为市场指数数据的获取方式。

#### Scenario: 正常获取数据

- **WHEN** API 路由收到市场数据请求
- **THEN** 通过 yahoo-finance2 的 quote 方法批量获取所有配置指数的实时行情数据

#### Scenario: yahoo-finance2 请求失败

- **WHEN** yahoo-finance2 请求超时或返回错误
- **THEN** API 返回完整指数列表但价格为空（非 500 错误），前端表格显示 `--` 兜底

### Requirement: 按市场分 Tab 图表展示

系统 SHALL 在市场页下方提供按市场分组的 Tab 图表区域，包含 A股、美股、港股、日股、波动率五个 Tab，每个 Tab 嵌入 TradingView Advanced Chart Widget 展示该市场的主要指数图表。

#### Scenario: Tab 默认展示

- **WHEN** 用户打开市场页
- **THEN** 图表区域默认显示第一个 Tab（A股），嵌入 TradingView Advanced Chart Widget 展示上证指数（SSE:000001）

#### Scenario: 切换市场 Tab

- **WHEN** 用户点击不同的市场 Tab（如"美股"）
- **THEN** 图表区域切换为该市场的 TradingView Advanced Chart Widget，默认展示该市场最重要的指数

### Requirement: Tab 内指数切换

系统 SHALL 在每个市场 Tab 内提供指数切换功能，允许用户在同一市场的多个指数间切换图表。

#### Scenario: 切换同市场指数

- **WHEN** 用户在 A股 Tab 内点击"沪深300"
- **THEN** 图表切换为沪深300（SSE:000300）的 TradingView Advanced Chart

#### Scenario: 单指数市场无切换

- **WHEN** 用户查看波动率 Tab
- **THEN** 仅展示 VIX（CBOE:VIX）图表，无指数切换按钮

### Requirement: VIX 情绪阈值提示

系统 SHALL 在波动率 Tab 的图表下方展示基于固定阈值的情绪参考区域，包含表情、文字和颜色编码。

#### Scenario: 情绪级别展示

- **WHEN** 用户切换到波动率 Tab
- **THEN** 图表下方显示 VIX 情绪阈值参考：VIX < 15 为 😌 市场平静（绿色）、15-20 为 😐 正常波动（蓝色）、20-30 为 😟 波动加剧（橙色）、30-40 为 😨 市场恐慌（红色）、> 40 为 🔥 极度恐慌（深红），当前 VIX 值对应的级别高亮

### Requirement: TradingView Widget 主题适配

系统 SHALL 将所有 TradingView Widget 配置为深色主题，与应用整体风格保持一致。

#### Scenario: 深色主题

- **WHEN** 市场页加载 TradingView Widget
- **THEN** 所有 Widget 使用深色主题（colorTheme: "dark"）

### Requirement: TradingView Widget 不可用时的兜底

系统 SHALL 在 TradingView Widget 无法加载特定指数时，显示提示信息和跳转链接。

#### Scenario: Widget 加载失败兜底

- **WHEN** TradingView Widget 无法展示某个指数
- **THEN** 显示"该指数暂不支持图表展示"提示，并提供"在 TradingView 查看"的跳转链接
