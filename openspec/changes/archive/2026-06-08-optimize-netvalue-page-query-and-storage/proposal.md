## Why

当前净值页把历史列表和图表都绑定到同一个全量 `/api/netvalue` 查询，随着记录天数增长会同时放大接口载荷、前端渲染开销和本地缓存体积。与此同时，`netvalue.dataJson` 仍保存净值页未消费的账户级快照，持续占用 Neon 免费版有限存储，不利于长期多用户使用。

## What Changes

- 将净值历史读取拆分为独立的列表接口与图表接口，避免列表分页与图表区间查询互相耦合。
- 为净值历史列表引入分页读取能力，默认每页 `30` 条，支持继续翻阅更早记录。
- 为净值图表引入固定区间与粒度映射：`30d/90d -> day`，`1y -> week`，`3y/all -> month`。
- 图表聚合改为服务端按周/月返回期末值，避免前端拉取整段日级历史后再聚合。
- 调整净值相关浏览器缓存策略与查询键拆分，列表和图表分别缓存，统一使用 `staleTime=60m`，保留写后失效。
- 精简 `netvalue.dataJson` 持久化结构，仅保留 `allocation` 与 `rates`，移除 `accounts`，并补充历史数据兼容迁移方案。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `daily-netvalue`: 净值历史查询改为列表分页与图表区间聚合分离，并收紧每日净值快照持久化内容。
- `visualization-charts`: 净值图表改为基于固定 `range + grain` 的服务端聚合结果展示，并定义周/月期末值口径。
- `client-cache-layer`: 为净值列表与净值图表定义独立查询键、参数化缓存和 `60m` 级 stale 策略。

## Impact

- 前端页面与组件：`src/app/netvalue/page.tsx`、`src/components/netvalue-charts.tsx`
- API 与服务：`src/app/api/netvalue/*`、`src/lib/services/netvalue-service.ts`
- 类型与缓存层：`src/lib/utils/types.ts`、`src/lib/cache/*`
- 数据模型与迁移：`src/db/schema-*.ts`、Drizzle 迁移/兼容脚本、历史 `netvalue.dataJson` 回填或读时兼容逻辑
