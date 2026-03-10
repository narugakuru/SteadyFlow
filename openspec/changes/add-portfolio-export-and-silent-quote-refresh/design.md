## Context

当前系统已经具备完整的手动股价刷新链路：`POST /api/holdings/fetch-prices` 会调用统一的持仓报价同步服务，更新 `holdings.price`、`holdings.marketValue` 与 `updatedAt`。Dashboard 也已有“更新股价”按钮，但它只覆盖显式手动操作，并默认展示逐条结果弹窗。

系统还存在一条每日执行一次的服务端 Cron 链路：`POST /api/cron/netvalue`。该链路会按用户执行“先同步股价、后记录净值”，因此它已经天然承担了“每日股价至少刷新一次”的保底职责。约束在于：Vercel 免费计划无法提供更高频率的后台调度，因此日内更新新鲜度需要依赖用户打开页面时的静默兜底刷新。

与此同时，当前并没有一个面向 agent 的完整投资组合导出接口。账户、持仓、资产配置、汇率、设置分散在多个接口中，既不利于手动验证，也不利于后续外部 agent 工具集成。

## Goals / Non-Goals

**Goals:**

- 提供一个完整的 JSON 投资组合快照导出接口，供人工验证和后续 agent 集成使用。
- 在 Dashboard 的“更新股价”按钮旁提供“导出”按钮，触发导出下载。
- 在现有报价同步链路上增加“触发模式”语义，区分手动刷新与静默兜底刷新。
- 记录独立的报价同步元数据，支撑静默刷新限流、首页股价更新时间展示、导出元数据输出。
- 复用现有 `POST /api/cron/netvalue` 每日链路作为后台保底刷新来源，而不是引入第二条 Cron。

**Non-Goals:**

- 不在本次 change 内实现外部 agent Token / API Key 认证。
- 不在本次 change 内实现 CSV 导出；第一版只定义并交付 JSON 导出。
- 不在本次 change 内改造 Accounts / Batch Update 页的静默刷新策略，第一版仅要求 Dashboard 落地兜底体验。
- 不在本次 change 内新增独立数据库表；优先复用现有 `settings` 键值存储元数据。

## Decisions

### 1. 导出接口采用单一完整快照，而不是复用多个现有接口

**选择**

- 新增 `GET /api/export/portfolio`，返回单个 JSON 文档。
- 响应按 `meta`、`summary`、`raw`、`derived` 分层：
  - `meta`：`schemaVersion`、`generatedAt`、`quoteSync` 元数据
  - `summary`：总资产、已实现/未实现/总盈亏
  - `raw`：`accounts`、`holdings`、`assetClasses`、汇率、非敏感设置
  - `derived`：资产配置与账户级派生视图
- 接口保留查询参数扩展位，如 `format=json`、`download=1`，但第一版仅支持 JSON。

**原因**

- agent 最需要的是一次请求拿到完整上下文，而不是自行拼装多个接口。
- `raw + derived` 兼顾“机器直接消费”和“后续自定义重算”两类需求。
- `schemaVersion` 可以为未来外部认证与格式演进提供兼容锚点。

**备选方案**

- 直接复用现有 `/api/accounts`、`/api/holdings`、`/api/asset-allocation`：实现快，但 agent 侧耦合过深。
- 只导出 CSV：更适合人工表格查看，但不适合嵌套结构与多层元数据表达。

### 2. 报价同步元数据存储在 `settings`，而不是新增专表

**选择**

- 继续使用 `settings(userId, key, value)` 存储报价同步状态。
- 计划使用一组独立键，例如：
  - `quote_sync.last_started_at`
  - `quote_sync.last_finished_at`
  - `quote_sync.last_success_at`
  - `quote_sync.last_status`
  - `quote_sync.last_trigger_source`
  - `quote_sync.last_summary`

**原因**

- 该项目已有成熟的用户级 KV 配置模式，新增少量状态键成本最低。
- 第一版元数据读取场景简单，不需要单独建表与迁移。
- 这些键后续也可安全并入导出接口的 `meta.quoteSync`。

**备选方案**

- 新增 `quote_sync_logs` 或 `quote_sync_state` 表：结构更清晰，但对第一版是过度设计。
- 复用 `holdings.updatedAt`：无法区分“手动编辑持仓”和“自动股价同步”，语义不可靠。

### 3. 手动刷新与静默刷新复用同一 API，但显式区分 trigger 模式

**选择**

- 保持 `POST /api/holdings/fetch-prices` 作为统一入口。
- 请求增加触发来源语义，例如 `trigger=manual | silent-client | cron`（可通过 body 或 query 传递）。
- 返回数据结构对手动模式维持现有逐条明细；静默模式允许沿用同结构但前端不弹窗，仅用于刷新数据与记录状态。

**原因**

- 报价同步服务已经成熟，重复拆路由只会增加维护成本。
- trigger 语义足以区分 UI 行为、元数据记录和后续排障来源。
- 现有每日 `cron/netvalue` 链路也可以通过同一触发来源统一入账。

**备选方案**

- 单独再建 `/api/holdings/fetch-prices-silent`：职责更直观，但会分裂接口契约。
- 仅靠前端决定是否弹窗，不向后端传 trigger：会丢失元数据来源，难以支撑后续诊断。

### 4. 每日后台保底刷新复用现有 `POST /api/cron/netvalue`

**选择**

- 不新增第二条 Cron 路由。
- 继续由 `POST /api/cron/netvalue` 在每日执行时先同步报价，再记录净值。
- 本次 change 只补充该链路对报价同步元数据的写入与汇总输出。

**原因**

- 用户明确受限于 Vercel 免费计划每日一次 Cron。
- 现有 daily netvalue 链路已经调用报价同步服务，复用成本最低且语义一致。
- 保持单一后台定时入口，减少部署配置与运维复杂度。

**备选方案**

- 新增 `POST /api/cron/quotes`：职责更纯，但与平台调度限制冲突，且会产生双链路配置负担。

### 5. Dashboard 静默兜底刷新只在页面层触发，并受陈旧阈值与进行中状态约束

**选择**

- Dashboard 加载成功后读取 `meta.quoteSync` 或独立查询返回的最近同步状态。
- 若满足“上次成功同步已超过阈值”且“当前没有进行中的同步”，则自动发起一次 `trigger=silent-client` 的静默刷新。
- 静默刷新不弹结果弹窗，只刷新页面数据与弱提示时间。
- 前端会话内增加一次性保护，避免单次页面生命周期重复触发。

**原因**

- 这是在无高频服务端调度条件下，提升日内新鲜度的最小可行方案。
- 静默刷新必须降噪，否则会破坏首页体验。
- 进行中状态与阈值判断可避免多标签页/多组件重复轰炸报价源。

**备选方案**

- 用前端 `setInterval` 周期轮询：页面关闭即失效，且会增加不必要请求。
- 全站多个页面都做静默刷新：覆盖更广，但第一版复杂度偏高，容易产生重复触发。

### 6. Dashboard 导出按钮直接下载 JSON 文件

**选择**

- 在首页“更新股价”按钮旁新增“导出”按钮。
- 点击后调用 `GET /api/export/portfolio?download=1`，由服务端返回 `application/json` 与下载文件名。

**原因**

- 用户明确需要第一版就有 UI 按钮。
- 下载文件是最直接的人工验证方式，也不影响未来外部 agent 直接调 API。

**备选方案**

- 只提供 API，不做 UI：验证门槛高，不满足本轮用户要求。
- 在前端拼装多接口后下载：会重复后端聚合逻辑，且容易出现前端/后端口径偏差。

## Risks / Trade-offs

- [静默刷新仍依赖用户打开页面] → 用现有每日 Cron 兜底，至少保证 24 小时内会刷新一次。
- [多标签页可能重复触发静默刷新] → 通过 `quote_sync.last_started_at`、页面会话锁和进行中判断限流。
- [settings 键值数量增长导致可读性下降] → 统一使用 `quote_sync.*` 前缀，并在导出与读取层集中映射。
- [导出接口载荷逐步膨胀] → 第一版只导出当前快照，不默认加入交易明细与历史净值。
- [未来外部认证加入后可能影响接口使用方式] → 通过稳定路径与 `schemaVersion` 维持协议兼容，认证仅作为接入层扩展。

## Migration Plan

1. 新增 `portfolio-export` 与 `quote-sync-metadata` 能力 spec，并更新 `auto-quote-fetch`、`dashboard` delta spec。
2. 实现导出接口与 Dashboard 导出按钮，先完成人工下载验证闭环。
3. 在报价同步服务入口增加 trigger 语义与 `quote_sync.*` 元数据写入。
4. 扩展 Dashboard：展示股价上次更新时间，并在满足条件时执行静默刷新。
5. 扩展 `POST /api/cron/netvalue`：在每日链路中更新 quote sync 元数据。
6. 验证手动刷新、静默刷新、每日 cron 三条路径共享同一元数据口径。

## Open Questions

- 静默刷新阈值第一版取 4 小时、6 小时还是 8 小时更合适？当前设计建议先落在 4~6 小时区间。
- 导出接口第一版是否需要包含 `transactions` 或 `netvalue` 历史？当前设计默认不包含，以控制载荷大小。
- 若未来需要支持 CLI / 外部 agent 无浏览器访问，认证层更适合个人 token 还是一次性签名链接？本次 change 只预留扩展位，不做定案。
