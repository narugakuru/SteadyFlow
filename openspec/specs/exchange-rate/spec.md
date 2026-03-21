## Purpose

定义 exchange-rate 能力的业务约束与验收标准。

## Requirements

### Requirement: 自动获取汇率

系统 SHALL 自动从外部 API 获取 USD/CNY 和 HKD/CNY 汇率。

#### Scenario: 成功获取汇率

- **WHEN** 系统请求汇率 API
- **THEN** 获取最新的 USD/CNY 和 HKD/CNY 汇率并缓存到数据库

### Requirement: 汇率缓存

系统 SHALL 将获取的汇率缓存到 SQLite，每日最多请求一次外部 API。缓存记录包含：币种对、汇率值、更新时间。

#### Scenario: 当日已有缓存

- **WHEN** 当天已获取过汇率，用户再次打开应用
- **THEN** 系统使用缓存的汇率，不再请求外部 API

#### Scenario: 缓存过期

- **WHEN** 缓存的汇率是昨天的，用户打开应用
- **THEN** 系统自动请求外部 API 获取最新汇率并更新缓存

### Requirement: 报价同步复用汇率缓存与降级策略

当报价同步链路请求汇率时，系统 SHALL 继续沿用现有 `USD/CNY` 与 `HKD/CNY` 的日级缓存策略。若缓存已过期，系统 MUST 在本次报价同步流程内拉取并持久化最新汇率，再供后续净值记录与资产换算读取；若同日内再次由报价同步链路请求汇率，系统 MUST 直接复用已刷新缓存。若外部汇率 API 不可用，系统 MUST 回退到最近一次缓存或默认汇率，且不得使报价同步请求整体失败。

#### Scenario: 报价同步先持久化新汇率再供换算使用

- **WHEN** 报价同步请求发现汇率缓存已过期，且外部汇率 API 返回成功
- **THEN** 系统先更新数据库中的 USD/CNY 与 HKD/CNY，再让后续净值记录或资产换算读取到新值

#### Scenario: 同日重复报价同步不重复请求外部汇率

- **WHEN** 用户在同一天内多次触发报价同步，且当天汇率已成功刷新
- **THEN** 系统复用当日缓存汇率，不重复请求外部汇率 API

#### Scenario: 报价同步中的汇率请求失败时回退缓存或默认值

- **WHEN** 报价同步期间外部汇率 API 请求失败
- **THEN** 系统返回最近一次缓存汇率；若无缓存则返回默认汇率，并继续完成本次报价同步流程

### Requirement: 汇率 API 不可用时的降级

系统 SHALL 在外部汇率 API 不可用时，使用最近一次缓存的汇率，并在 UI 上显示汇率的最后更新时间。

#### Scenario: API 请求失败

- **WHEN** 汇率 API 请求超时或返回错误
- **THEN** 系统使用数据库中最近一次缓存的汇率，Dashboard 显示"汇率更新于: YYYY-MM-DD"提示

#### Scenario: 首次使用且 API 不可用

- **WHEN** 数据库中无任何汇率缓存且 API 不可用
- **THEN** 系统使用内置的默认汇率（USD/CNY=7.2, HKD/CNY=0.92），并提示用户汇率为默认值

### Requirement: 汇率用于金额换算

汇率换算结果 SHALL 使用 `roundForStorage()` 截断到存储精度（最多4位小数），显示时使用 `formatAmount()` 格式化。汇率本身的显示保持 `formatRate()` 固定4位小数不变。

#### Scenario: 换算结果显示

- **WHEN** USD 账户 $10,000 按 USD/CNY=7.2345 换算
- **THEN** 换算结果存储为 `72345`，显示为 `¥72,345`

#### Scenario: 汇率显示不变

- **WHEN** 显示 USD/CNY 汇率 7.2
- **THEN** 显示为 `7.2000`（固定4位小数）
