## Why

现有自动报价链路对港股/A股的可用性和可观测性不足：用户很难判断失败是代码格式问题、供应商权限问题还是未配置密钥，且结果只显示摘要不显示逐条明细。需要补齐多供应商回退与可视化结果明细，降低手工排查成本并提高更新成功率。

## What Changes

- 将港股/A股报价源调整为 `Twelve Data` 主、`EODHD` 备；美股/日股继续使用 `Stooq`。
- 在用户设置中新增 `Twelve Data API Key` 与 `EODHD API Key`，按用户维度保存。
- 自动报价接口增加代码规范化与多候选映射：
  - A股：支持 `.SS/.SZ` 到 Twelve Data 可识别格式的映射与回退。
  - 美股：支持 `BRK.B.US -> brk-b.us` 这类 Stooq 兼容转换。
- `Twelve Data` 对港股/A股按 8 条/批请求，批次间隔约 65 秒，降低触发限频概率。
- 报价结果从“摘要提示”升级为“弹窗逐条明细”，每行一个标的：
  - 成功项显示最新价与来源（供应商 + 实时/昨收）。
  - 失败/跳过项显示具体原因（含供应商原始错误）。

## Capabilities

### New Capabilities

- `quote-provider-settings`: 用户可在设置中配置并保存报价供应商 API Key（Twelve Data/EODHD），供自动报价接口按用户读取。

### Modified Capabilities

- `auto-quote-fetch`: 扩展报价源分发、港股/A股主备回退、代码映射与失败原因透传，并扩展返回结果字段。
- `dashboard`: “更新股价”交互由摘要提示改为弹窗逐条明细展示。
- `batch-update`: “更新股价”交互由摘要提示改为弹窗逐条明细展示。

## Impact

- API 路由：`POST /api/holdings/fetch-prices`、`GET/PUT /api/settings`
- 前端页面/组件：`/`、`/batch-update`、设置弹窗新增 API Key 输入、结果弹窗组件
- 数据模型：`settings` 增加用户级键 `quote_api.twelvedata_key`、`quote_api.eodhd_key`
- 数据源适配：新增 Twelve Data、EODHD 封装；Stooq 代码格式兼容增强
