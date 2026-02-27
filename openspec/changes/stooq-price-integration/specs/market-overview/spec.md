## MODIFIED Requirements

### Requirement: 数据获取使用 Stooq CSV API

系统 SHALL 使用 Stooq 免费 CSV API 作为市场指数数据的获取方式，替代已失效的 yahoo-finance2。

#### Scenario: 正常获取数据

- **WHEN** API 路由收到市场数据请求
- **THEN** 通过 Stooq CSV API 逐个获取所有有 Stooq 符号的指数行情数据，解析 CSV 中的 close/date/time 字段

#### Scenario: Stooq 请求失败

- **WHEN** Stooq API 请求超时或返回错误
- **THEN** API 返回完整指数列表但价格为空（非 500 错误），前端表格显示 `--` 兜底

#### Scenario: 不支持的指数

- **WHEN** 指数配置中 stooq 符号为 null（如 A 股指数）
- **THEN** 该指数在返回数据中 price=0、change=0、changePercent=0、updatedAt=""，前端显示 `--`

### Requirement: 指数行情表格展示

系统 SHALL 在市场页上方以静态骨架模式展示全球主要指数表格，按市场分组（美股、A股、港股、日股、波动率）。表格结构（指数名称、TradingView 跳转链接）始终显示，不依赖 API 数据。价格、涨跌、涨跌幅列通过 Stooq CSV API 动态填充，API 失败或指数不支持时显示 `--`。

#### Scenario: 正常数据展示

- **WHEN** 用户打开市场页且 API 返回数据成功
- **THEN** 有 Stooq 数据的指数显示名称、最新价、涨跌、涨跌幅、更新时间；无 Stooq 数据的指数（A 股等）显示 `--`；每行末尾有 TradingView 跳转链接图标

#### Scenario: API 失败时的兜底展示

- **WHEN** 用户打开市场页且 API 请求失败
- **THEN** 表格仍显示所有指数名称和 TradingView 跳转链接，价格/涨跌/涨跌幅列显示 `--`，更新时间列显示 `-`

#### Scenario: 加载中状态

- **WHEN** 用户打开市场页且数据正在加载
- **THEN** 表格骨架正常显示，价格列显示加载占位符动画

## REMOVED Requirements

### Requirement: 数据获取使用 yahoo-finance2

**Reason**: yahoo-finance2 API 已完全失效，无法获取任何数据
**Migration**: 替换为 Stooq CSV API，移除 yahoo-finance2 npm 依赖
