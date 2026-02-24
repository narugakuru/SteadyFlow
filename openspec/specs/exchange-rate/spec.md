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

### Requirement: 汇率 API 不可用时的降级
系统 SHALL 在外部汇率 API 不可用时，使用最近一次缓存的汇率，并在 UI 上显示汇率的最后更新时间。

#### Scenario: API 请求失败
- **WHEN** 汇率 API 请求超时或返回错误
- **THEN** 系统使用数据库中最近一次缓存的汇率，Dashboard 显示"汇率更新于: YYYY-MM-DD"提示

#### Scenario: 首次使用且 API 不可用
- **WHEN** 数据库中无任何汇率缓存且 API 不可用
- **THEN** 系统使用内置的默认汇率（USD/CNY=7.2, HKD/CNY=0.92），并提示用户汇率为默认值

### Requirement: 汇率用于金额换算
系统 SHALL 使用缓存的汇率将非 CNY 账户的金额换算为 CNY，用于总资产计算和占比计算。

#### Scenario: USD 账户金额换算
- **WHEN** USD 账户总额为 10000，USD/CNY 汇率为 7.2
- **THEN** 该账户换算为 CNY 金额 ¥72,000 参与总资产汇总
