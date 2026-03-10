## Why

当前系统缺少一个面向外部 agent 工具的完整投资组合导出接口，导致持仓、账户、汇率与资产配置数据需要由多个接口拼装，不利于后续自动化决策与手动校验。与此同时，股价刷新仍主要依赖用户显式点击按钮，在 Vercel 免费计划仅支持每日一次 Cron 的前提下，需要补充“每日定时保底 + 页面静默兜底”的更新策略，降低数据陈旧风险。

## What Changes

- 新增一个完整投资组合导出接口，返回适合 agent 消费的 JSON 快照，并支持手动下载验证。
- 在 Dashboard 页头的“更新股价”按钮旁新增“导出”按钮，便于用户手动验证导出内容。
- 扩展自动报价能力：保留手动更新明细弹窗，同时新增静默触发模式，用于页面加载后的兜底刷新，不弹出结果明细。
- 为报价同步增加独立的元数据记录（上次开始/完成/成功时间、状态、触发来源等），并在总资产看板处以弱提示显示“股价上次更新时间”。
- 复用现有每日 Cron 链路作为股价自动保底刷新入口，并补充页面静默兜底；未来外部认证机制先保留扩展空间，不在本次 change 内实现。

## Capabilities

### New Capabilities

- `portfolio-export`: 提供完整投资组合快照导出 API 与手动导出入口，供用户和外部 agent 工具消费。
- `quote-sync-metadata`: 提供报价同步元数据记录与读取能力，支撑静默兜底刷新和 UI 更新时间展示。

### Modified Capabilities

- `auto-quote-fetch`: 扩展股价更新接口与调度能力，支持手动模式与静默模式，并与现有每日 Cron 链路协同完成保底刷新。
- `dashboard`: 在首页新增导出按钮，并展示不显眼的股价上次更新时间提示。

## Impact

- Affected APIs: `GET /api/export/portfolio`（新增）、报价相关 API 路由（扩展）、现有 `POST /api/cron/netvalue` 链路（扩展元数据记录）。
- Affected UI: `src/app/page.tsx`、报价结果交互、总资产卡片弱提示。
- Affected data/storage: `settings` 中新增报价同步元数据键；导出接口需汇聚 `accounts`、`holdings`、`assetClasses`、`exchangeRates`、资产配置派生数据等。
- Affected services: 持仓报价同步服务、Dashboard 数据查询与未来外部 agent 接入边界。
