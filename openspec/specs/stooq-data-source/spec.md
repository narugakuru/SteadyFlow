## Requirements

### Requirement: Stooq CSV API 数据获取

系统 SHALL 提供通用的 Stooq CSV API 数据获取函数，支持通过 Stooq 符号获取最新行情数据（收盘价、开盘价、最高价、最低价、成交量、日期、时间）。请求失败或返回无效数据时 SHALL 返回 null 而非抛出异常。

#### Scenario: 成功获取单个符号数据

- **WHEN** 系统请求 Stooq 符号 `aapl.us` 的行情数据
- **THEN** 返回解析后的数据对象，包含 symbol、date、time、open、high、low、close、volume 字段

#### Scenario: 符号不存在或无数据

- **WHEN** 系统请求 Stooq 符号 `invalid.xx` 的行情数据，Stooq 返回 CSV 但 close 列为 `N/D`
- **THEN** 返回 null

#### Scenario: 网络请求失败

- **WHEN** Stooq API 请求超时或网络错误
- **THEN** 返回 null，不抛出异常

### Requirement: 批量获取多个符号数据

系统 SHALL 支持批量获取多个 Stooq 符号的行情数据，逐个请求以避免并发限制，返回成功获取的数据列表。

#### Scenario: 批量获取混合结果

- **WHEN** 系统批量请求 `["aapl.us", "invalid.xx", "msft.us"]` 三个符号
- **THEN** 返回包含 `aapl.us` 和 `msft.us` 数据的列表，`invalid.xx` 被跳过

#### Scenario: 全部失败

- **WHEN** 系统批量请求多个符号但 Stooq 服务不可用
- **THEN** 返回空列表
