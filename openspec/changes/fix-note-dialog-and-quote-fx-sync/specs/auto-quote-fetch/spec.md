## ADDED Requirements

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
