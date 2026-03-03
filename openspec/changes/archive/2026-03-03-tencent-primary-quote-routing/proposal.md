## Why

当前港股/A股报价主链路依赖需要 API Key 的第三方供应商，用户在未配置 key 或命中套餐限制时会频繁失败。腾讯简易行情接口对港股/A股覆盖更直接、调用门槛更低，适合作为默认主路由以提升可用性和维护稳定性。

## What Changes

- 调整 `POST /api/holdings/fetch-prices` 的市场分发与优先级：
- `.US` / `.JP` 继续走 Stooq。
- `.SS` / `.SZ` / `.HK` / `.BJ` 改为优先走腾讯简易接口（`qt.gtimg.cn`）。
- 腾讯返回不可用时，再尝试 EODHD（若用户已配置 key）。
- Twelve Data 降级为最低权重可选备份，仅在前两级不可用且用户配置了 key 时才尝试。
- 新增腾讯代码映射规范：A股/北交所使用 `sh/sz/bj` 前缀，港股使用 `hk` + 5 位补零；并约束批量请求分片与失败重试策略。
- 移除历史固定延时策略（包括 Twelve Data 的 65s 批次等待）；所有供应商请求链路不再引入人工秒级 sleep。
- 设置语义调整：Twelve Data 不再是默认必需路径，仅作为可选兜底配置项保留。
- 返回结果中的 `provider` 字段需可区分 `tencent`、`eodhd`、`twelve-data`，便于诊断路由命中情况。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `auto-quote-fetch`: 调整亚洲市场（含北交所）报价主备链路为腾讯主路由，EODHD 次级，Twelve Data 最低权重可选备份，并补充腾讯代码映射与批量约束。
- `quote-provider-settings`: 调整供应商配置要求，明确 Twelve Data/EODHD 均为可选项，未配置 Twelve Data 不影响腾讯主链路执行。

## Impact

- Affected API: `POST /api/holdings/fetch-prices`
- Affected code: `src/app/api/holdings/fetch-prices/route.ts`, `src/lib/twelve-data.ts`, `src/lib/eodhd.ts`，新增腾讯适配层（如 `src/lib/tencent-quote.ts`）
- Affected data/settings keys: 继续使用 `quote_api.twelvedata_key`、`quote_api.eodhd_key`，但 Twelve Data 从主路径降级为可选备份
- External dependency usage: 新增/主用 `qt.gtimg.cn` 行情接口调用策略（分片、重试、容错）
