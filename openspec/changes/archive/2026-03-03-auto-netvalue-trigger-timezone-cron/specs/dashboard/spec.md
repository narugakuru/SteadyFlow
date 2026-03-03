## MODIFIED Requirements

### Requirement: Dashboard 导航

系统 SHALL 在 Dashboard header 区域保留标题，并在右侧仅提供「自动获取报价」按钮；系统 MUST 移除「记录净值」手动按钮。点击「自动获取报价」后调用 `POST /api/holdings/fetch-prices`，显示加载状态，完成后展示更新结果摘要 toast，并刷新页面数据。净值刷新由自动触发链路处理，不再由 Dashboard 手动操作承担。

#### Scenario: Dashboard header 布局

- **WHEN** 用户打开 Dashboard
- **THEN** header 区域显示标题和「自动获取报价」按钮，不显示「记录净值」按钮

#### Scenario: 点击自动获取报价

- **WHEN** 用户在 Dashboard 点击「自动获取报价」按钮
- **THEN** 按钮显示加载状态，调用 `POST /api/holdings/fetch-prices`，完成后显示 toast 提示更新结果摘要（成功 N 个、失败 N 个、跳过 N 个），页面资产数据自动刷新

#### Scenario: 无可更新持仓

- **WHEN** 用户没有任何可自动更新报价的 shares 模式持仓
- **THEN** toast 提示“没有可自动更新的持仓”
