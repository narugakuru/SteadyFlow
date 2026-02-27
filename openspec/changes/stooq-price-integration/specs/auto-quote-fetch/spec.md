## ADDED Requirements

### Requirement: 自动获取持仓报价 API

系统 SHALL 提供 `POST /api/holdings/fetch-prices` 端点，为当前用户所有 shares 模式且 ticker 匹配 Stooq 格式（`*.us`、`*.jp`）的持仓自动拉取最新价格并更新 `price` 和 `marketValue`。MUST 验证所有持仓属于当前登录用户。

#### Scenario: 成功更新美股持仓价格

- **WHEN** 当前用户有 shares 模式持仓 ticker=`aapl.us`，shares=100，旧 price=150
- **THEN** 系统从 Stooq 获取 AAPL 最新收盘价（如 175），更新 price=175，marketValue=100×175=17500，返回该持仓在 updated 列表中

#### Scenario: Stooq 拉取失败的持仓

- **WHEN** 当前用户有 shares 模式持仓 ticker=`xyz.us`，但 Stooq 返回无数据
- **THEN** 该持仓的 price 和 marketValue 不变，返回该持仓在 failed 列表中

#### Scenario: 跳过不符合格式的持仓

- **WHEN** 当前用户有持仓 ticker=`600519`（无 Stooq 后缀）或 ticker 为空
- **THEN** 该持仓不参与自动拉取，返回在 skipped 列表中

#### Scenario: 跳过 amount 模式持仓

- **WHEN** 当前用户有 amount 模式持仓 ticker=`aapl.us`
- **THEN** 该持仓不参与自动拉取，返回在 skipped 列表中

#### Scenario: 返回结果结构

- **WHEN** 自动报价完成
- **THEN** API 返回 JSON `{ updated: [{id, name, ticker, oldPrice, newPrice}], failed: [{id, name, ticker, error}], skipped: [{id, name, ticker, reason}] }`

#### Scenario: 未登录用户

- **WHEN** 未登录用户请求 `POST /api/holdings/fetch-prices`
- **THEN** 系统返回 401

### Requirement: Dashboard 自动报价按钮

系统 SHALL 在 Dashboard header 区域的「记录净值」按钮左边新增「自动获取报价」按钮。点击后调用 `POST /api/holdings/fetch-prices`，显示加载状态，完成后展示更新结果摘要（成功 N 个、失败 N 个、跳过 N 个），并刷新页面数据。

#### Scenario: 点击自动获取报价

- **WHEN** 用户在 Dashboard 点击「自动获取报价」按钮
- **THEN** 按钮显示加载状态，调用 API 完成后显示 toast 提示更新结果摘要，页面数据自动刷新

#### Scenario: 无可更新持仓

- **WHEN** 用户没有任何 Stooq 格式 ticker 的 shares 模式持仓
- **THEN** toast 提示"没有可自动更新的持仓"

### Requirement: 批量更新页面自动报价按钮

系统 SHALL 在 batch-update 页面顶部新增「自动获取报价」按钮，功能与 Dashboard 按钮一致。

#### Scenario: 批量更新页面点击自动获取报价

- **WHEN** 用户在 batch-update 页面点击「自动获取报价」按钮
- **THEN** 按钮显示加载状态，调用 API 完成后显示 toast 提示更新结果摘要，页面持仓数据自动刷新
