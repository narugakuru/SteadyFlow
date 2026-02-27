## Requirements

### Requirement: Yahoo Finance 数据获取封装

系统 SHALL 提供 Yahoo Finance（yahoo-finance2）数据获取封装函数，支持通过 Yahoo 符号获取最新行情数据。用于 A 股指数/个股（`.SS`/`.SZ`）、港股（`.HK`）和恒生科技等 Stooq 不覆盖的市场。请求失败时 SHALL 返回 null 而非抛出异常。

#### Scenario: 成功获取 A 股指数数据

- **WHEN** 系统请求 Yahoo 符号 `000300.SS` 的行情数据
- **THEN** 返回解析后的数据对象，包含 symbol、price（regularMarketPrice）、change、changePercent、updatedAt 字段

#### Scenario: 批量获取多个 Yahoo 符号

- **WHEN** 系统批量请求 `["000300.SS", "000001.SS", "^HSTECH"]`
- **THEN** 通过 yahoo-finance2 的 quote 方法一次性获取，返回成功的数据列表

#### Scenario: Yahoo 请求失败

- **WHEN** yahoo-finance2 请求超时或返回错误
- **THEN** 返回空列表，不抛出异常

#### Scenario: 获取个股报价

- **WHEN** 系统请求 Yahoo 符号 `600519.SS`（贵州茅台）的行情数据
- **THEN** 返回包含 regularMarketPrice 的数据对象
