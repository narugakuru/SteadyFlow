## MODIFIED Requirements

### Requirement: 自动获取持仓报价 API

系统 SHALL 提供 `POST /api/holdings/fetch-prices` 端点，为当前用户所有 shares 模式且 ticker 匹配可识别格式的持仓自动拉取最新价格并更新 `price` 和 `marketValue`。  
报价分发规则 MUST 为：

- `.US` / `.JP` 使用 Stooq（保留原有实现）
- `.SS` / `.SZ` / `.HK` 优先使用 Twelve Data，失败后回退 EODHD

系统 MUST 从当前用户 settings 读取 `quote_api.twelvedata_key` 与 `quote_api.eodhd_key`。拉取失败时 MUST NOT 修改该持仓的 price 和 marketValue。MUST 验证所有持仓属于当前登录用户。

#### Scenario: 成功更新美股持仓价格（Stooq）

- **WHEN** 当前用户有 shares 模式持仓 ticker=`aapl.us`，shares=100，旧 price=150
- **THEN** 系统从 Stooq 获取最新价格并更新 price 与 marketValue，返回该持仓在 updated 列表中

#### Scenario: 成功更新 A 股持仓价格（Twelve Data）

- **WHEN** 当前用户有 shares 模式持仓 ticker=`601088.SS` 且已配置 Twelve Data key
- **THEN** 系统使用 Twelve Data 的 A 股兼容映射获取价格，更新该持仓并返回在 updated 列表中

#### Scenario: Twelve Data 失败后回退 EODHD

- **WHEN** 当前用户有 shares 模式持仓 ticker=`0700.HK`，Twelve Data 无法返回可用价格，但 EODHD 可返回价格
- **THEN** 系统使用 EODHD 价格更新该持仓并返回在 updated 列表中

#### Scenario: Twelve Data 受套餐限制且未配置 EODHD

- **WHEN** 当前用户有 shares 模式持仓 ticker=`601088.SS`，Twelve Data 返回“symbol 仅 Pro 可用”，且未配置 EODHD key
- **THEN** 该持仓保持原值，并在 failed 列表中返回供应商原始错误信息

#### Scenario: Stooq 特殊代码兼容

- **WHEN** 当前用户有 shares 模式持仓 ticker=`BRK.B.US`
- **THEN** 系统将其转换为 Stooq 兼容符号后拉取报价，并在成功时更新该持仓

#### Scenario: 跳过 amount 模式持仓

- **WHEN** 当前用户有 amount 模式持仓 ticker=`aapl.us`
- **THEN** 该持仓不参与自动拉取，返回在 skipped 列表中

#### Scenario: 返回结果结构

- **WHEN** 自动报价完成
- **THEN** API 返回 JSON `{ updated: [{id, name, ticker, oldPrice, newPrice, provider, source}], failed: [{id, name, ticker, error}], skipped: [{id, name, ticker, reason}] }`

#### Scenario: 未登录用户

- **WHEN** 未登录用户请求 `POST /api/holdings/fetch-prices`
- **THEN** 系统返回 401

### Requirement: Dashboard 自动报价按钮

系统 SHALL 在 Dashboard header 区域提供“更新股价”按钮。点击后调用 `POST /api/holdings/fetch-prices`，显示加载状态，完成后 MUST 展示逐条结果明细弹窗（每行一个标的），并刷新页面数据。

#### Scenario: 点击自动获取报价

- **WHEN** 用户在 Dashboard 点击“更新股价”按钮
- **THEN** 按钮显示加载状态，调用 API 完成后弹出明细列表（成功/失败/跳过逐条显示），并刷新页面数据

#### Scenario: 明细展示成功项最新价格

- **WHEN** 自动报价返回 updated 项
- **THEN** 弹窗中该标的行显示最新股价与来源信息（provider + source）

### Requirement: 批量更新页面自动报价按钮

系统 SHALL 在 batch-update 页面顶部提供“更新股价”按钮，功能与 Dashboard 一致：点击后调用 `POST /api/holdings/fetch-prices`，完成后 MUST 展示逐条明细弹窗并刷新页面持仓数据。

#### Scenario: 批量更新页面点击自动获取报价

- **WHEN** 用户在 batch-update 页面点击“更新股价”按钮
- **THEN** 按钮显示加载状态，调用 API 完成后弹出逐条明细并刷新页面数据
