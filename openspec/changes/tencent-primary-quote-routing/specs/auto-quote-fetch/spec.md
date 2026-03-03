## MODIFIED Requirements

### Requirement: 自动获取持仓报价 API

系统 SHALL 提供 `POST /api/holdings/fetch-prices` 端点，为当前用户所有 shares 模式且 ticker 匹配可识别格式的持仓自动拉取最新价格并更新 `price` 和 `marketValue`。  
报价分发规则 MUST 为：

- `.US` / `.JP` 使用 Stooq（保留原有实现）
- `.SS` / `.SZ` / `.HK` / `.BJ` 优先使用腾讯简易接口（`qt.gtimg.cn`）
- 腾讯返回不可用时，若已配置 `quote_api.eodhd_key`，则回退 EODHD
- 腾讯与 EODHD 均不可用时，若已配置 `quote_api.twelvedata_key`，则回退 Twelve Data（最低权重可选备份）

系统 MUST 按市场规则完成腾讯 symbol 映射：

- `.SS` -> `sh` + 6 位代码
- `.SZ` -> `sz` + 6 位代码
- `.BJ` -> `bj` + 6 位代码
- `.HK` -> `hk` + 5 位代码（不足 5 位前补零）

系统 MUST 读取当前用户 settings 中的 `quote_api.eodhd_key` 与 `quote_api.twelvedata_key` 作为回退凭证。拉取失败时 MUST NOT 修改该持仓的 `price` 和 `marketValue`。系统 MUST 验证所有持仓属于当前登录用户。

#### Scenario: 成功更新美股持仓价格（Stooq）

- **WHEN** 当前用户有 shares 模式持仓 ticker=`aapl.us`，shares=100，旧 price=150
- **THEN** 系统从 Stooq 获取最新价格并更新 `price` 与 `marketValue`，返回该持仓在 `updated` 列表中

#### Scenario: 成功更新 A 股持仓价格（Tencent）

- **WHEN** 当前用户有 shares 模式持仓 ticker=`601088.SS`
- **THEN** 系统使用腾讯映射 `sh601088` 获取价格并更新该持仓，`provider` 返回 `tencent`

#### Scenario: 成功更新港股持仓价格（Tencent 5 位补零）

- **WHEN** 当前用户有 shares 模式持仓 ticker=`700.HK`
- **THEN** 系统将其映射为 `hk00700` 请求腾讯并在成功时更新该持仓

#### Scenario: 成功更新北交所持仓价格（Tencent）

- **WHEN** 当前用户有 shares 模式持仓 ticker=`835185.BJ`
- **THEN** 系统使用 `bj835185` 请求腾讯并在成功时更新该持仓

#### Scenario: 腾讯失败后回退 EODHD

- **WHEN** 当前用户有 shares 模式持仓 ticker=`0700.HK`，腾讯未返回可用价格，且已配置 EODHD key
- **THEN** 系统使用 EODHD 获取价格并更新该持仓，`provider` 返回 `eodhd`

#### Scenario: 腾讯与 EODHD 失败后回退 Twelve Data

- **WHEN** 当前用户有 shares 模式持仓 ticker=`601088.SS`，腾讯与 EODHD 均未返回可用价格，且已配置 Twelve Data key
- **THEN** 系统使用 Twelve Data 获取价格并更新该持仓，`provider` 返回 `twelve-data`

#### Scenario: 未配置任何回退 key 但腾讯可用

- **WHEN** 当前用户未配置 EODHD/Twelve Data key，且其 A 股或港股持仓可由腾讯返回价格
- **THEN** 系统仍可成功更新该持仓，不因缺少 key 失败

#### Scenario: 腾讯失败且无可用回退配置

- **WHEN** 当前用户有 shares 模式亚洲持仓，腾讯无可用价格，且未配置可用的 EODHD/Twelve Data key
- **THEN** 该持仓保持原值，并在 `failed` 列表中返回明确失败原因

#### Scenario: Stooq 特殊代码兼容

- **WHEN** 当前用户有 shares 模式持仓 ticker=`BRK.B.US`
- **THEN** 系统将其转换为 Stooq 兼容符号后拉取报价，并在成功时更新该持仓

#### Scenario: 跳过 amount 模式持仓

- **WHEN** 当前用户有 amount 模式持仓 ticker=`aapl.us`
- **THEN** 该持仓不参与自动拉取，返回在 `skipped` 列表中

#### Scenario: 返回结果结构

- **WHEN** 自动报价完成
- **THEN** API 返回 JSON `{ updated: [{id, name, ticker, oldPrice, newPrice, provider, source}], failed: [{id, name, ticker, error}], skipped: [{id, name, ticker, reason}] }`，且 `provider` 至少可区分 `tencent`、`eodhd`、`twelve-data`

#### Scenario: 未登录用户

- **WHEN** 未登录用户请求 `POST /api/holdings/fetch-prices`
- **THEN** 系统返回 401
