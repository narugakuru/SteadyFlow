## Requirements

### Requirement: Yahoo Finance 数据获取封装

系统 SHALL 提供 Yahoo Finance（yahoo-finance2）数据获取封装函数，支持通过 Yahoo 符号获取最新行情数据。当前用于美股 `.US` 持仓的第一优先级报价源；后续也可扩展到 A 股指数/个股（`.SS`/`.SZ`）、港股（`.HK`）等 Yahoo 覆盖市场。请求失败时 SHALL 返回 null 或空列表而非抛出异常，调用方 MUST 准备回退数据源。封装函数 MUST 优先调用 `quote()`；当 `quote()` 报错或遗漏部分 symbol 时，MUST 使用 `quoteSummary(symbol, { modules: ["price"] })` 对缺失 symbol 进行 Yahoo 内部兜底。

#### Scenario: 成功获取美股个股数据

- **WHEN** 系统请求 Yahoo 符号 `AAPL` 的行情数据
- **THEN** 返回解析后的数据对象，包含 symbol、price（regularMarketPrice）、change、changePercent、updatedAt 字段

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
