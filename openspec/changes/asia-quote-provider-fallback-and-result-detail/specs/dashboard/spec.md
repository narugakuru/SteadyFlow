## MODIFIED Requirements

### Requirement: Dashboard 导航

系统 SHALL 在 Dashboard header 区域保留标题，并提供“更新股价”按钮。点击后调用 `POST /api/holdings/fetch-prices`，显示加载状态，完成后 MUST 弹出逐条结果明细（每行一个标的，含成功/失败/跳过信息）并刷新页面数据。

#### Scenario: Dashboard header 布局

- **WHEN** 用户打开 Dashboard
- **THEN** header 区域显示标题与“更新股价”按钮

#### Scenario: 点击更新股价

- **WHEN** 用户在 Dashboard 点击“更新股价”按钮
- **THEN** 按钮显示加载状态，完成后展示结果明细弹窗并刷新资产数据

#### Scenario: 明细弹窗显示成功项最新价

- **WHEN** 自动报价返回 updated 项
- **THEN** 明细中每个成功项显示 ticker、名称、最新股价、供应商来源与实时/昨收标识
