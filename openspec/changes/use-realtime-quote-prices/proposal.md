## Why

当前自动股价同步仍可能写入前一交易日收盘价，尤其在美股盘前、盘后与接近 24 小时交易环境下，Dashboard 的资产趋势和纪律判断会滞后。报价刷新应以供应商可返回的最新实时/准实时价格为优先口径，而不是默认落到上一交易日收盘价。

## What Changes

- 美股自动报价改为优先使用 Yahoo Finance 的实时/盘前/盘后可交易价格字段，仅在无实时字段时才降级到常规市场价格。
- Yahoo 内部 `quoteSummary(price)` 兜底也采用同一实时价格选择口径，避免 quote 失败后回到收盘价口径。
- EODHD 回退继续使用 realtime 接口，并明确不得用 EODHD EOD/历史收盘价替代当前价。
- 报价同步结果中的 `source` 继续展示供应商符号，并允许实现附带价格字段来源，便于排查价格来自 regular/pre/post/marketState。
- 不改变持仓、交易或净值表结构；不新增用户配置项。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `auto-quote-fetch`: 自动报价 API 的成功更新语义从“最新价格”收紧为“实时/准实时价格优先，禁止主动使用前一交易日收盘价替代当前价”。
- `yahoo-data-source`: Yahoo Finance 封装的价格解析口径改为优先读取 `regularMarketPrice`、`postMarketPrice`、`preMarketPrice` 等当前行情字段，并按市场状态选择最能代表当前可交易价格的字段。

## Impact

- 影响 `src/lib/data-source/yahoo.ts` 或等价 Yahoo 封装、`src/lib/services/quote-sync` 或等价报价同步服务，以及 `POST /api/holdings/fetch-prices` 复用链路。
- 影响手动刷新、Dashboard 静默刷新与每日 Cron 净值前置报价刷新。
- 需要补充/调整报价字段选择测试，覆盖美股盘前、盘后、常规交易、仅有 previousClose 的无效降级场景。
