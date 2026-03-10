## MODIFIED Requirements

### Requirement: Dashboard 导航

系统 SHALL 在 Dashboard header 区域保留标题，并在右侧提供「更新股价」与「导出」两个按钮；系统 MUST 不显示「记录净值」手动按钮。点击「更新股价」后调用 `POST /api/holdings/fetch-prices` 的手动模式，显示加载状态，完成后展示逐条结果明细弹窗并刷新页面数据。点击「导出」后 MUST 触发当前用户投资组合 JSON 快照下载。

#### Scenario: Dashboard header 布局

- **WHEN** 用户打开 Dashboard
- **THEN** header 区域显示标题、「更新股价」按钮和「导出」按钮，不显示「记录净值」按钮

#### Scenario: 点击手动更新股价

- **WHEN** 用户在 Dashboard 点击「更新股价」按钮
- **THEN** 按钮显示加载状态，调用手动模式报价同步接口，完成后弹出逐条明细结果并刷新页面资产数据

#### Scenario: 点击导出

- **WHEN** 用户在 Dashboard 点击「导出」按钮
- **THEN** 系统下载当前用户的投资组合 JSON 快照文件

## ADDED Requirements

### Requirement: Dashboard 股价更新时间提示

系统 SHALL 在总资产卡片区域展示一个不显眼的股价更新时间提示，用于表达最近一次成功报价同步时间。该提示 MUST 与前端查询缓存时间区分，不得复用纯前端 `DataFreshness` 语义。

#### Scenario: 展示最近成功同步时间

- **WHEN** 当前用户存在最近一次成功报价同步记录
- **THEN** 总资产卡片显示“股价更新：<最近成功时间或相对时间>”的弱提示

#### Scenario: 尚无成功同步记录

- **WHEN** 当前用户从未成功同步过股价
- **THEN** 总资产卡片显示“股价更新：暂未成功同步”或等效弱提示文案

### Requirement: Dashboard 静默报价兜底刷新

Dashboard 在数据加载完成后 SHALL 判断股价数据是否超过陈旧阈值；若已超过阈值且当前不存在进行中的报价同步，则页面 MUST 自动触发一次静默报价刷新。静默刷新 MUST 不弹出逐条结果明细弹窗，但完成后 MUST 刷新页面资产数据与股价更新时间提示。

#### Scenario: 进入 Dashboard 时数据已过期

- **WHEN** 用户打开 Dashboard，且最近一次成功报价同步已超过系统设定的陈旧阈值
- **THEN** 页面自动触发一次静默报价刷新，不弹出结果弹窗，并在完成后刷新资产数据与股价更新时间提示

#### Scenario: 进入 Dashboard 时数据仍新鲜

- **WHEN** 用户打开 Dashboard，且最近一次成功报价同步尚未超过陈旧阈值
- **THEN** 页面不触发静默报价刷新

#### Scenario: 已有进行中的报价同步

- **WHEN** 用户打开 Dashboard 时系统判断已有进行中的报价同步
- **THEN** 页面不再重复发起第二次静默报价刷新
