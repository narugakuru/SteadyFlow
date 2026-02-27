## Why

Yahoo Finance API（yahoo-finance2）在本地完全失效，但在服务器端部分生效（A 股指数、恒生科技可用，东证指数不可用）。市场概览页需要恢复数据获取能力。同时，持仓股价目前只能手动更新，对于有明确股票代码的持仓，应支持自动拉取最新价格。此外，现有 `cost` 字段在 shares 模式下语义模糊（存储总成本），需要重新定义为"平均每股成本"以支持更清晰的成本价/现价分离展示。

## What Changes

- **新增 Stooq 免费 CSV API 作为主要市场数据源**，保留 yahoo-finance2 作为 A 股/港股补充数据源，形成双数据源互补架构
- **市场指数配置重写**：每个指数标记数据源（stooq / yahoo），Stooq 覆盖美股/日股/VIX/HSI（6 个），Yahoo 覆盖 A 股 4 个 + 恒生科技（5 个），东证指数暂无可用源显示为空
- **新增持仓自动报价功能**：双数据源拉取持仓现价——Stooq 拉取 `.us`/`.jp` 后缀的美股/日股，Yahoo 拉取 `.SS`/`.SZ`/`.HK` 后缀的 A 股/港股。拉取失败时不修改股价
- **自动报价触发入口**：batch-update 页面 + Dashboard 首页（记录净值按钮左边）各加一个「自动获取报价」按钮
- **cost 字段语义变更（shares 模式）**：**BREAKING** — `cost` 从"总成本金额"改为"平均每股成本"。总成本 = cost × shares，盈亏 = marketValue - 总成本。需要数据迁移（`cost = cost / shares`）
- **交易副作用逻辑调整（shares 模式）**：买入时 cost 按加权平均法重算；卖出时 cost 不变；买入/卖出均更新 price 为成交价
- **编辑持仓对话框增强**：新增成本价（cost）和现价（price）的手动修正入口
- **新建持仓表单增强**：ticker 字段增加格式提示，引导用户填写正确格式（美股 `aapl.us`、日股 `7203.jp`、A 股 `600519.SS`、港股 `0700.HK`）

## Capabilities

### New Capabilities

- `stooq-data-source`: Stooq CSV API 数据获取层，包含指数行情和个股报价的通用拉取逻辑
- `yahoo-data-source`: Yahoo Finance（yahoo-finance2）数据获取层封装，用于 A 股/港股指数和个股报价
- `auto-quote-fetch`: 持仓自动报价功能，双数据源批量拉取持仓现价并更新 price/marketValue

### Modified Capabilities

- `market-overview`: 数据源改为 Stooq + Yahoo 双源互补，指数配置重写，每个指数标记数据源
- `holding-management`: cost 字段语义变更（shares 模式下为平均每股成本）；编辑对话框新增成本价/现价修正入口；新建表单 ticker 格式提示；持仓展示中盈亏计算公式变更
- `transaction-management`: shares 模式买入时 cost 按加权平均法重算（不再累加总成本）；卖出时 cost 不变（不再按均价扣减）；买入/卖出均更新 price 为成交价
- `batch-update`: 新增「自动获取报价」按钮，调用 auto-quote-fetch 能力
- `dashboard`: header 区域记录净值按钮左边新增「自动获取报价」按钮

## Impact

- **数据库**：需要数据迁移脚本，将 shares 模式持仓的 `cost` 从总成本转换为平均每股成本（`cost = cost / shares`，shares > 0 时）
- **依赖**：保留 `yahoo-finance2`（A 股/港股数据源），无新增 npm 依赖（Stooq 使用原生 fetch）
- **API 路由**：修改 `/api/market`；新增 `/api/holdings/fetch-prices`
- **前端组件**：修改 market-config.ts、market-data.ts、HoldingEditDialog、HoldingRow、batch-update 页面、Dashboard 页面、新建持仓表单
- **盈亏计算**：所有引用 cost 计算盈亏的地方需要适配新公式（总成本 = cost × shares）
