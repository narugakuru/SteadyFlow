## Requirements

### Requirement: 自动获取持仓报价 API

系统 SHALL 提供 `POST /api/holdings/fetch-prices` 端点，为当前用户当前持有的 shares 模式且 ticker 匹配可识别格式的持仓自动拉取实时/准实时当前价格并更新 `price` 和 `marketValue`。当前持有 MUST 以 shares 模式持仓的 `shares > 0` 判定；shares 为空、无效或小于等于 0 的 shares 模式持仓 MUST NOT 请求任何外部报价源，并 MUST 返回在 `skipped` 列表中。请求 MUST 支持显式触发来源语义，用于区分 `manual`、`silent-client` 与 `cron` 等模式；不同模式 MUST 复用同一报价同步核心逻辑，并使用统一口径写入报价同步元数据。
报价分发规则 MUST 为：

- `.US` 优先使用 Yahoo Finance（`yahoo-finance2`），并以 Yahoo 当前行情字段选择实时/准实时当前价
- Yahoo Finance 无可用当前价格或请求失败时，若当前用户已配置 `quote_api.eodhd_key`，则回退 EODHD realtime
- `.SS` / `.SZ` / `.HK` / `.BJ` 优先使用腾讯简易接口（`qt.gtimg.cn`）
- 腾讯返回不可用时，若已配置 `quote_api.eodhd_key`，则回退 EODHD realtime
- 腾讯与 EODHD 均不可用时，若已配置 `quote_api.twelvedata_key`，则回退 Twelve Data（最低权重可选备份），且 Twelve Data MUST 仅使用当前报价字段

系统 MUST 按市场规则完成腾讯 symbol 映射：

- `.SS` -> `sh` + 6 位代码
- `.SZ` -> `sz` + 6 位代码
- `.BJ` -> `bj` + 6 位代码
- `.HK` -> `hk` + 5 位代码（不足 5 位前补零）

系统 MUST 读取当前用户 settings 中的 `quote_api.eodhd_key` 与 `quote_api.twelvedata_key` 作为回退凭证；用户只能使用自己设置的供应商密钥，系统 MUST NOT 使用部署环境变量或其他共享密钥代替用户级 EODHD key。拉取失败时 MUST NOT 修改该持仓的 `price` 和 `marketValue`。系统 MUST 验证所有持仓属于当前登录用户。系统 MUST NOT 在 Tencent、EODHD、Twelve Data 请求链路中引入固定秒级延时（例如 65s 批次等待）。EODHD 回退请求 MUST 先按最多 10 个 symbol 一组调用实时批量接口；当待回退 symbol 数量不超过 10 且实时批量接口返回全部价格时，系统 MUST 只执行 1 次 EODHD realtime HTTP 请求。EODHD 回退 MUST NOT 使用 EOD/历史收盘价接口补价；Twelve Data 回退 MUST NOT 使用 `previous_close` 补价。手动与静默模式返回的结果结构 MUST 保持兼容，至少包含 `updated`、`failed`、`skipped` 三类结果。

#### Scenario: 成功更新美股持仓价格（Yahoo Finance）

- **WHEN** 当前用户有 shares 模式持仓 ticker=`aapl.us`，shares=100，旧 price=150
- **THEN** 系统将其转换为 Yahoo 符号 `AAPL` 并优先通过 Yahoo Finance 获取实时/准实时当前价格，成功时更新 price 与 marketValue，返回该持仓在 updated 列表中，`provider` 返回 `yahoo-finance2`，`source` 返回 `realtime`

#### Scenario: 美股盘前价格优先于常规市场价格

- **WHEN** Yahoo Finance 返回 `marketState=PRE` 且同时包含 `preMarketPrice` 与 `regularMarketPrice`
- **THEN** 系统使用 `preMarketPrice` 更新持仓，而不是使用上一交易日常规市场价格

#### Scenario: 美股盘后价格优先于常规市场价格

- **WHEN** Yahoo Finance 返回 `marketState=POST` 且同时包含 `postMarketPrice` 与 `regularMarketPrice`
- **THEN** 系统使用 `postMarketPrice` 更新持仓，而不是使用常规交易时段收盘后的滞后价格

#### Scenario: 美股盘前缺少扩展交易价格时进入回退

- **WHEN** Yahoo Finance 返回 `marketState=PRE` 且只有 `regularMarketPrice`，没有可用的 `preMarketPrice`
- **THEN** 系统 MUST NOT 使用 `regularMarketPrice` 更新持仓，并按 Yahoo 无可用当前价格进入 EODHD 回退或失败结果

#### Scenario: 美股 CLOSED 状态缺少扩展交易价格时进入回退

- **WHEN** Yahoo Finance 返回 `marketState=CLOSED` 且只有 `regularMarketPrice`，没有可用的 `postMarketPrice` 或 `preMarketPrice`
- **THEN** 系统 MUST NOT 使用 `regularMarketPrice` 更新持仓，并按 Yahoo 无可用当前价格进入 EODHD 回退或失败结果

#### Scenario: Yahoo quote 失败后使用 quoteSummary

- **WHEN** yahoo-finance2 的 `quote()` 对美股 symbol 请求失败或遗漏该 symbol
- **THEN** 系统使用 `quoteSummary(symbol, { modules: ["price"] })` 再尝试获取实时/准实时当前价格，成功时仍以 `provider=yahoo-finance2` 和 `source=realtime` 更新持仓

#### Scenario: Yahoo 仅返回前收字段时进入回退

- **WHEN** Yahoo Finance 对某个美股 symbol 只返回 `regularMarketPreviousClose`、`previousClose` 或其他前一交易日收盘字段
- **THEN** 系统 MUST NOT 使用这些字段更新持仓，并按 Yahoo 无可用当前价格进入 EODHD 回退或失败结果

#### Scenario: 美股 Yahoo 失败后回退 EODHD

- **WHEN** 当前用户有 shares 模式持仓 ticker=`BRK.B.US`，Yahoo Finance 未返回可用当前价格，且已配置 EODHD key
- **THEN** 系统将其转换为 EODHD 符号 `BRK-B.US` 并使用 EODHD realtime 获取价格，成功时更新该持仓，`provider` 返回 `eodhd`，`source` 返回 `realtime`

#### Scenario: 未配置个人 EODHD key 不使用环境变量回退

- **WHEN** 当前用户未配置 `quote_api.eodhd_key`，但部署环境存在 `EODHD_API_KEY`，且美股 Yahoo 或亚洲腾讯未返回可用价格
- **THEN** 系统 MUST NOT 使用部署环境中的 EODHD key 发起回退请求，并在对应持仓失败原因中返回 EODHD 未配置 API Key

#### Scenario: 少量 EODHD 美股回退使用单次批量实时请求

- **WHEN** 多个 `.US` 持仓均未从 Yahoo Finance 获取到可用价格，且待回退 EODHD symbol 数量不超过 10
- **THEN** 系统通过一次 EODHD realtime 请求提交主 symbol 和 `s=` 附加 symbol 列表，并按返回数组更新所有可用实时报价

#### Scenario: EODHD realtime 未返回价格时不请求历史收盘价

- **WHEN** EODHD realtime 批量请求未对某个 symbol 返回可用当前价格
- **THEN** 系统 MUST NOT 请求 EODHD EOD/历史接口获取上一交易日收盘价，该持仓保持原值并进入 failed 列表

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
- **THEN** 系统使用 EODHD realtime 获取价格并更新该持仓，`provider` 返回 `eodhd`，`source` 返回 `realtime`

#### Scenario: 少量亚洲 EODHD 回退使用单次批量实时请求

- **WHEN** 多个亚洲市场持仓均未从腾讯获取到可用价格，且待回退 EODHD symbol 数量不超过 10
- **THEN** 系统通过一次 EODHD realtime 请求批量获取这些 symbol 的价格，并按返回数组更新所有可用实时报价

#### Scenario: 腾讯与 EODHD 失败后回退 Twelve Data

- **WHEN** 当前用户有 shares 模式持仓 ticker=`601088.SS`，腾讯与 EODHD 均未返回可用价格，且已配置 Twelve Data key
- **THEN** 系统使用 Twelve Data 当前报价字段获取价格并更新该持仓，`provider` 返回 `twelve-data`，`source` 返回 `realtime`

#### Scenario: Twelve Data 仅返回 previous_close 时失败

- **WHEN** Twelve Data 对某个候选 symbol 只返回 `previous_close` 而没有可用的 `close` 或 `price`
- **THEN** 系统 MUST NOT 使用 `previous_close` 更新持仓，并继续尝试下一个候选或将该持仓返回 failed

#### Scenario: Twelve Data 不使用固定延时批次等待

- **WHEN** 当前用户触发自动报价并命中 Twelve Data 回退路径
- **THEN** 系统不执行固定 65 秒或其他秒级 sleep 等待，按无固定延时策略继续请求与回退流程

#### Scenario: 未配置任何回退 key 但腾讯可用

- **WHEN** 当前用户未配置 EODHD/Twelve Data key，且其 A 股或港股持仓可由腾讯返回价格
- **THEN** 系统仍可成功更新该持仓，不因缺少 key 失败

#### Scenario: 腾讯失败且无可用回退配置

- **WHEN** 当前用户有 shares 模式亚洲持仓，腾讯无可用价格，且未配置可用的 EODHD/Twelve Data key
- **THEN** 该持仓保持原值，并在 `failed` 列表中返回明确失败原因

#### Scenario: 美股特殊代码兼容

- **WHEN** 当前用户有 shares 模式持仓 ticker=`BRK.B.US`
- **THEN** 系统将其转换为 Yahoo/EODHD 兼容符号 `BRK-B` / `BRK-B.US` 后拉取报价，并在成功时更新该持仓

#### Scenario: 跳过 amount 模式持仓

- **WHEN** 当前用户有 amount 模式持仓 ticker=`aapl.us`
- **THEN** 该持仓不参与自动拉取，返回在 skipped 列表中

#### Scenario: 跳过已清仓 shares 模式持仓

- **WHEN** 当前用户有 shares 模式持仓 ticker=`aapl.us`，shares=0，且旧 price=150
- **THEN** 该持仓不请求任何外部报价源，不修改 price 与 marketValue，并返回在 skipped 列表中

#### Scenario: 返回结果结构

- **WHEN** 自动报价完成
- **THEN** API 返回 JSON `{ updated: [{id, name, ticker, oldPrice, newPrice, provider, source}], failed: [{id, name, ticker, error}], skipped: [{id, name, ticker, reason}] }`，且 `provider` 至少可区分 `yahoo-finance2`、`tencent`、`eodhd`、`twelve-data`；新的成功更新结果 MUST NOT 返回 `source=previous_close`

#### Scenario: 静默模式不改变接口语义

- **WHEN** 页面以 `silent-client` 触发一次报价同步
- **THEN** 系统仍返回兼容的 `updated`、`failed`、`skipped` 结构，并按静默来源记录报价同步元数据

#### Scenario: Cron 模式记录来源

- **WHEN** 每日后台链路以 `cron` 触发一次报价同步
- **THEN** 系统使用与手动模式一致的报价同步逻辑，并将触发来源记录为 `cron`

#### Scenario: 未登录用户

- **WHEN** 未登录用户请求 `POST /api/holdings/fetch-prices`
- **THEN** 系统返回 401

### Requirement: 报价同步请求联动刷新汇率

系统 SHALL 在 `POST /api/holdings/fetch-prices` 的所有触发来源中联动执行汇率刷新检查，包括 `manual`、`silent-client` 与 `cron`。该检查 MUST 属于同一条报价同步核心流程，而不是依赖后续净值记录副作用。即使本次请求没有任何持仓价格更新成功、或根本没有可更新持仓，系统也 MUST 执行汇率刷新检查。若当日汇率缓存已新鲜，系统 MUST 直接复用缓存且不得重复请求外部汇率 API。

#### Scenario: 手动更新股价时同步刷新过期汇率

- **WHEN** 用户手动调用 `POST /api/holdings/fetch-prices`，且 USD/CNY 或 HKD/CNY 汇率缓存已过期
- **THEN** 系统在本次报价同步流程内刷新汇率缓存，并使后续资产换算可读取到该轮最新汇率

#### Scenario: 无成功报价更新时仍检查汇率

- **WHEN** 用户触发一次报价同步，但结果没有任何 `updated` 项
- **THEN** 系统仍执行同一请求内的汇率刷新检查，不因缺少成功报价更新而跳过

#### Scenario: 静默与 Cron 触发复用同一汇率刷新路径

- **WHEN** 页面以 `silent-client` 或每日后台以 `cron` 触发报价同步
- **THEN** 系统复用与手动模式一致的汇率刷新检查逻辑，而不是走独立的例外路径

#### Scenario: 汇率刷新不可用时报价结果仍返回

- **WHEN** 报价同步过程中汇率外部源不可用
- **THEN** 系统继续返回本次报价同步的 `updated`、`failed`、`skipped` 结果，并改用汇率能力定义的降级结果

### Requirement: Dashboard 自动报价按钮

系统 SHALL 在 Dashboard/总览中提供手动报价刷新操作。点击后调用 `POST /api/holdings/fetch-prices`，显示加载状态，完成后 MUST 展示逐条结果明细弹窗（每行一个标的），并刷新页面数据。该操作 MUST NOT 导航到独立的股价更新页面。

#### Scenario: 点击自动获取报价

- **WHEN** 用户在 Dashboard 点击“更新股价”按钮
- **THEN** 按钮显示加载状态，调用 API 完成后弹出明细列表（成功/失败/跳过逐条显示），并刷新页面数据

#### Scenario: 明细展示成功项最新价格

- **WHEN** 自动报价返回 updated 项
- **THEN** 弹窗中该标的行显示最新股价与来源信息（provider + source）

#### Scenario: 不跳转股价更新页

- **WHEN** 用户在 Dashboard/总览触发手动报价刷新
- **THEN** 系统留在当前总览页，不跳转到 `/batch-update`

### Requirement: 每日后台报价保底刷新

系统 SHALL 复用现有 `POST /api/cron/netvalue` 每日链路作为后台报价保底刷新入口。该链路在为用户记录当日净值前 MUST 先执行一次报价同步，并使用 `cron` 触发来源记录报价同步元数据。

#### Scenario: 每日 Cron 先同步报价再记录净值

- **WHEN** 每日 `POST /api/cron/netvalue` 链路开始处理某个用户
- **THEN** 系统先执行一次 `cron` 来源的报价同步，随后再记录该用户当日净值

#### Scenario: 后台报价失败仍保留净值链路宽松模式

- **WHEN** 每日 Cron 为某个用户执行报价同步失败或部分失败
- **THEN** 系统仍按现有宽松模式继续记录净值，同时写入该次报价同步的失败状态与摘要元数据
