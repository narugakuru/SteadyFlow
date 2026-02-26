## ADDED Requirements

### Requirement: 顶部指数滚动条

系统 SHALL 在市场页顶部展示 TradingView Ticker Tape Widget，滚动显示所有跟踪指数的实时价格和涨跌幅。

#### Scenario: 滚动条展示

- **WHEN** 用户打开市场页
- **THEN** 页面顶部显示横向滚动条，包含 S&P500、纳斯达克100、道琼斯、沪深300、上证指数、创业板指、中证500、恒生指数、恒生科技、日经225、东证指数、VIX 的实时价格和涨跌幅

### Requirement: 指数 Mini Chart 网格

系统 SHALL 以 2 列网格布局展示各市场主要指数的 TradingView Mini Chart Widget，按市场分组（美股、A股、港股、日股）。

#### Scenario: 网格展示

- **WHEN** 用户浏览市场页中部区域
- **THEN** 显示 2 列网格，每个指数一个 Mini Chart 卡片，按美股（S&P500、纳斯达克100、道琼斯）、A股（沪深300、上证指数、创业板指、中证500）、港股（恒生指数、恒生科技）、日股（日经225、东证指数）分组展示

### Requirement: VIX 恐慌/波动图表

系统 SHALL 在市场页底部展示 CBOE VIX 指数的 TradingView Advanced Chart Widget。

#### Scenario: VIX 图表展示

- **WHEN** 用户浏览市场页底部区域
- **THEN** 显示 VIX 的完整 K 线图表，支持缩放和时间范围切换

### Requirement: VIX 情绪阈值提示

系统 SHALL 在 VIX 图表旁展示基于固定阈值的情绪参考区域，包含表情、文字和颜色编码。

#### Scenario: 情绪级别展示

- **WHEN** 用户查看 VIX 区域
- **THEN** 显示以下情绪阈值参考：VIX < 15 为 😌 市场平静（绿色）、15-20 为 😐 正常波动（蓝色）、20-30 为 😟 波动加剧（橙色）、30-40 为 😨 市场恐慌（红色）、> 40 为 🔥 极度恐慌（深红），每个级别附带一句投资理念提示语

### Requirement: TradingView Widget 主题适配

系统 SHALL 将所有 TradingView Widget 配置为深色主题，与应用整体风格保持一致。

#### Scenario: 深色主题

- **WHEN** 市场页加载 TradingView Widget
- **THEN** 所有 Widget 使用深色主题（colorTheme: "dark"）
