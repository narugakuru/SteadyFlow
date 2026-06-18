## MODIFIED Requirements

### Requirement: Yahoo Finance 数据获取封装

系统 SHALL 提供 Yahoo Finance（yahoo-finance2）数据获取封装函数，支持通过 Yahoo 符号获取最新行情数据。当前用于美股 `.US` 持仓的第一优先级报价源；后续也可扩展到 A 股指数/个股（`.SS`/`.SZ`）、港股（`.HK`）等 Yahoo 覆盖市场。请求失败时 SHALL 返回 null 或空列表而非抛出异常，调用方 MUST 准备回退数据源。封装函数 MUST 优先调用 `quote()`；当 `quote()` 报错或遗漏部分 symbol 时，MUST 使用 `quoteSummary(symbol, { modules: ["price"] })` 对缺失 symbol 进行 Yahoo 内部兜底。封装函数 MUST 只从 Yahoo 当前行情字段解析价格；当 `marketState` 为 `PRE` 时 MUST 优先选择 `preMarketPrice`，为 `POST` 或 `POSTPOST` 时 MUST 优先选择 `postMarketPrice`，为 `REGULAR` 时 MUST 优先选择 `regularMarketPrice`。当市场状态与字段缺失不匹配时，系统 MUST 在 `postMarketPrice`、`preMarketPrice`、`regularMarketPrice` 中选择可用正数价格；系统 MUST NOT 使用 `regularMarketPreviousClose`、`previousClose` 或其他上一交易日收盘字段作为成功报价。

#### Scenario: 成功获取美股个股数据

- **WHEN** 系统请求 Yahoo 符号 `AAPL` 的行情数据，且 Yahoo 返回 `regularMarketPrice`
- **THEN** 返回解析后的数据对象，包含 symbol、price、change、changePercent、updatedAt 字段，price 来自当前行情字段而不是上一交易日收盘字段

#### Scenario: 批量获取多个 Yahoo 符号

- **WHEN** 系统批量请求 `["AAPL", "MSFT", "BRK-B"]`
- **THEN** 通过 yahoo-finance2 的 quote 方法一次性获取，返回成功的数据列表

#### Scenario: Yahoo 请求失败

- **WHEN** yahoo-finance2 的 `quote()` 请求超时或返回错误
- **THEN** 系统继续尝试 `quoteSummary()` 的 `price` 模块；若仍失败，则返回空列表，不抛出异常

#### Scenario: Yahoo 批量请求遗漏部分 symbol

- **WHEN** yahoo-finance2 的 `quote()` 批量响应只返回部分 symbol
- **THEN** 系统仅对缺失 symbol 调用 `quoteSummary()`，并合并成功结果返回

#### Scenario: 美股带点号代码映射

- **WHEN** 自动报价链路接收 ticker=`BRK.B.US`
- **THEN** 调用 Yahoo 前将其转换为 Yahoo 符号 `BRK-B`

#### Scenario: 盘前市场使用 preMarketPrice

- **WHEN** Yahoo 返回 `marketState=PRE`、`preMarketPrice=101`、`regularMarketPrice=100`
- **THEN** 封装函数返回 price=101

#### Scenario: 盘后市场使用 postMarketPrice

- **WHEN** Yahoo 返回 `marketState=POST`、`postMarketPrice=103`、`regularMarketPrice=100`
- **THEN** 封装函数返回 price=103

#### Scenario: 仅有前收字段时不返回报价

- **WHEN** Yahoo 返回 `regularMarketPreviousClose=99` 或 `previousClose=99`，但没有可用的 `postMarketPrice`、`preMarketPrice`、`regularMarketPrice`
- **THEN** 封装函数返回 null 或空列表，使调用方进入回退数据源
