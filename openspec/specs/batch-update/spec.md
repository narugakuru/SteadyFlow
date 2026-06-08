## Purpose

定义 batch-update 能力在独立页面下线后的业务约束与验收标准。

## Requirements

### Requirement: 独立股价更新页下线

系统 SHALL 下线独立的 `/batch-update` 股价更新页面。该页面不得再作为产品主流程展示当前用户账户和持仓编辑列表；用户也不得通过全局导航进入该页面。

#### Scenario: 导航不显示股价更新页

- **WHEN** 已登录用户查看全局导航
- **THEN** 导航中不显示“股价更新”或指向 `/batch-update` 的入口

#### Scenario: 直接访问下线页面

- **WHEN** 用户直接访问 `/batch-update`
- **THEN** 系统不渲染旧股价更新页面，并重定向到 `/`

### Requirement: 报价刷新能力保留

系统 SHALL 保留 `POST /api/holdings/fetch-prices`、Dashboard/总览手动报价刷新、Dashboard 静默报价刷新与每日 Cron 报价刷新能力。独立页面下线不得影响 shares 模式当前持仓报价同步、amount 模式跳过、逐条结果弹窗和缓存失效刷新口径。

#### Scenario: Dashboard 仍可手动更新股价

- **WHEN** 用户在 Dashboard/总览点击“更新股价”
- **THEN** 系统调用 `POST /api/holdings/fetch-prices`，完成后展示逐条明细并刷新页面数据

#### Scenario: 背景报价链路不受影响

- **WHEN** Dashboard 静默刷新或每日 Cron 触发报价同步
- **THEN** 系统继续复用报价同步核心逻辑，不依赖 `/batch-update` 页面存在

### Requirement: 持仓市值编辑迁移

系统 SHALL 继续通过账户页、纪律表持仓编辑弹窗或其他现有持仓编辑入口维护持仓市值、股价、成本与资产类别。独立批量更新页面下线后，不再要求提供一个集中 inline 编辑所有持仓市值的页面。

#### Scenario: 编辑单个持仓

- **WHEN** 用户需要修正某个持仓的市值或价格
- **THEN** 用户通过现有持仓编辑弹窗完成修改
