## MODIFIED Requirements

### Requirement: Dashboard 自动报价按钮

系统 SHALL 在 Dashboard/总览中提供手动报价刷新操作。点击后调用 `POST /api/holdings/fetch-prices`，显示加载状态，完成后 MUST 展示逐条结果明细弹窗（每行一个标的），并刷新页面数据。该操作 MUST NOT 导航到独立的股价更新页面。

#### Scenario: 点击自动获取报价

- **WHEN** 用户在 Dashboard/总览点击手动报价刷新操作
- **THEN** 操作显示加载状态，调用 API 完成后弹出明细列表（成功/失败/跳过逐条显示），并刷新页面数据

#### Scenario: 明细展示成功项最新价格

- **WHEN** 自动报价返回 updated 项
- **THEN** 弹窗中该标的行显示最新股价与来源信息（provider + source）

#### Scenario: 不跳转股价更新页

- **WHEN** 用户在 Dashboard/总览触发手动报价刷新
- **THEN** 系统留在当前总览页，不跳转到 `/batch-update`

## REMOVED Requirements

### Requirement: 批量更新页面自动报价按钮

**Reason**: The standalone batch-update page is decommissioned.
**Migration**: Use Dashboard/总览 manual quote refresh and existing background quote refresh flows.
