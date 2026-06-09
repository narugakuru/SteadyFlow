## Requirements

### Requirement: Yahoo Finance 数据获取封装

系统 SHALL 提供 Yahoo Finance（yahoo-finance2）数据获取封装函数，支持通过 Yahoo 符号获取最新行情数据。当前用于美股 `.US` 持仓的第一优先级报价源；后续也可扩展到 A 股指数/个股（`.SS`/`.SZ`）、港股（`.HK`）等 Yahoo 覆盖市场。请求失败时 SHALL 返回 null 或空列表而非抛出异常，调用方 MUST 准备回退数据源。

#### Scenario: 成功获取美股个股数据

- **WHEN** 系统请求 Yahoo 符号 `AAPL` 的行情数据
- **THEN** 返回解析后的数据对象，包含 symbol、price（regularMarketPrice）、change、changePercent、updatedAt 字段

#### Scenario: 批量获取多个 Yahoo 符号

- **WHEN** 系统批量请求 `["AAPL", "MSFT", "BRK-B"]`
- **THEN** 通过 yahoo-finance2 的 quote 方法一次性获取，返回成功的数据列表

#### Scenario: Yahoo 请求失败

- **WHEN** yahoo-finance2 请求超时或返回错误
- **THEN** 返回空列表，不抛出异常

#### Scenario: 美股带点号代码映射

- **WHEN** 自动报价链路接收 ticker=`BRK.B.US`
- **THEN** 调用 Yahoo 前将其转换为 Yahoo 符号 `BRK-B`
