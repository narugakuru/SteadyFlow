## MODIFIED Requirements

### Requirement: 指数行情表格展示

系统 SHALL 在市场页上方以静态骨架模式展示全球主要指数表格，按市场分组（美股、A股、港股、日股、波动率）。表格结构（指数名称、TradingView 跳转链接）始终显示，不依赖 API 数据。价格、涨跌、涨跌幅列通过 API 动态填充，API 失败时显示 `--`。

#### Scenario: 正常数据展示

- **WHEN** 用户打开市场页且 API 返回数据成功
- **THEN** 表格显示所有指数的名称、最新价、涨跌、涨跌幅、更新时间，每行末尾有 TradingView 跳转链接图标

#### Scenario: API 失败时的兜底展示

- **WHEN** 用户打开市场页且 API 请求失败
- **THEN** 表格仍显示所有指数名称和 TradingView 跳转链接，价格/涨跌/涨跌幅列显示 `--`，更新时间列显示 `-`

#### Scenario: 加载中状态

- **WHEN** 用户打开市场页且数据正在加载
- **THEN** 表格骨架正常显示，价格列显示加载占位符

### Requirement: 数据获取使用 yahoo-finance2

系统 SHALL 使用 `yahoo-finance2` npm 包作为市场指数数据的获取方式，替代裸 HTTP 请求。

#### Scenario: 正常获取数据

- **WHEN** API 路由收到市场数据请求
- **THEN** 通过 yahoo-finance2 的 quote 方法批量获取所有配置指数的实时行情数据

#### Scenario: yahoo-finance2 请求失败

- **WHEN** yahoo-finance2 请求超时或返回错误
- **THEN** API 返回空价格数据（非 500 错误），前端表格显示 `--` 兜底

## REMOVED Requirements

### Requirement: 顶部指数滚动条

**Reason**: TradingView Ticker Tape Widget 方案被 Advanced Chart Widget + Tab 布局替代，后者提供更丰富的交互和更好的信息密度。
**Migration**: 指数实时价格通过上方表格展示，详细图表通过下方 Tab 区域的 Advanced Chart Widget 展示。

### Requirement: 指数 Mini Chart 网格

**Reason**: Mini Chart 功能有限且部分 A 股指数不支持，被 Advanced Chart Widget 替代。
**Migration**: 使用 TradingView Advanced Chart Widget 按市场分 Tab 展示，支持更多指数和更丰富的交互。

### Requirement: VIX 恐慌/波动图表

**Reason**: VIX 图表整合到波动率 Tab 中，不再作为独立区域。
**Migration**: VIX Advanced Chart 移至波动率 Tab，VIX 情绪阈值参考组件保留在该 Tab 图表下方。
