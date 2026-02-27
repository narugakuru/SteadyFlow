## Requirements

### Requirement: 指数行情表格展示

系统 SHALL 在市场页上方以静态骨架模式展示全球主要指数表格，按市场分组（美股、A股、港股、日股、波动率）。表格结构（指数名称、TradingView 跳转链接）始终显示，不依赖 API 数据。价格、涨跌、涨跌幅列通过双数据源动态填充，API 失败或指数不支持时显示 `--`。

#### Scenario: 正常数据展示

- **WHEN** 用户打开市场页且双数据源均返回成功
- **THEN** 所有有数据源的指数显示名称、最新价、涨跌、涨跌幅、更新时间；无数据源的指数（东证指数）显示 `--`；每行末尾有 TradingView 跳转链接图标

#### Scenario: API 全部失败时的兜底展示

- **WHEN** 用户打开市场页且所有 API 请求失败
- **THEN** 表格仍显示所有指数名称和 TradingView 跳转链接，价格/涨跌/涨跌幅列显示 `--`，更新时间列显示 `-`

#### Scenario: 加载中状态

- **WHEN** 用户打开市场页且数据正在加载
- **THEN** 表格骨架正常显示，价格列显示加载占位符动画

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

### Requirement: 数据获取使用双数据源（Stooq + Yahoo）

系统 SHALL 使用 Stooq 免费 CSV API 和 yahoo-finance2 作为市场指数数据的双数据源。每个指数在配置中标记数据源（`stooq` / `yahoo` / `null`），系统根据标记分别调用对应 API。Stooq 覆盖美股/日股/VIX/HSI，Yahoo 覆盖 A 股/恒生科技。任一数据源请求失败时 SHALL 不影响其他数据源的结果，失败的指数显示 `--` 兜底。

#### Scenario: 正常获取数据（双源）

- **WHEN** API 路由收到市场数据请求
- **THEN** 系统按指数配置的 source 字段分组，Stooq 源的指数通过 Stooq CSV API 获取，Yahoo 源的指数通过 yahoo-finance2 的 quote 方法获取，合并结果返回

#### Scenario: Stooq 请求失败但 Yahoo 正常

- **WHEN** Stooq API 请求超时，但 Yahoo API 正常返回
- **THEN** Stooq 源的指数（美股/日股/VIX/HSI）显示 `--`，Yahoo 源的指数（A 股/恒生科技）正常显示价格

#### Scenario: Yahoo 请求失败但 Stooq 正常

- **WHEN** Yahoo API 请求失败，但 Stooq API 正常返回
- **THEN** Yahoo 源的指数显示 `--`，Stooq 源的指数正常显示价格

#### Scenario: 无数据源的指数

- **WHEN** 指数配置中 source 为 null（如东证指数）
- **THEN** 该指数在返回数据中 price=0、change=0、changePercent=0、updatedAt=""，前端显示 `--`
