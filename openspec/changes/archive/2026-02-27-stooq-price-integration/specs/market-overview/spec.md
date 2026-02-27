## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: 数据获取使用 yahoo-finance2

**Reason**: yahoo-finance2 不再作为唯一数据源，改为双数据源架构（Stooq 主力 + Yahoo 补充）
**Migration**: 市场指数获取改为按 source 字段分发到 Stooq 或 Yahoo，yahoo-finance2 依赖保留用于 A 股/港股
