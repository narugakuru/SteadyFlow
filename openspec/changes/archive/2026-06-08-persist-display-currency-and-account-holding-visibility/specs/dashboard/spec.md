## MODIFIED Requirements

### Requirement: Dashboard 总览支持全局显示货币

系统 SHALL 将 Dashboard header 中的货币下拉作为全站统一的显示货币控制入口，并把当前选择持久化到浏览器本地存储。该状态 MUST 不写入数据库；用户在 Dashboard 选择“默认 / USD / CNY / HKD”后，Dashboard、账户页、交易页的金额展示 MUST 共享同一状态。`默认` 的语义 MUST 为“显示记录原始币种金额”，而不是统一折算为 CNY。

#### Scenario: 首次进入页面默认使用原币视图

- **WHEN** 用户首次进入网站，且本地存储中不存在有效的显示货币偏好
- **THEN** Dashboard 的货币下拉默认选中“默认”，页面金额按各记录原始币种展示

#### Scenario: 刷新后恢复最近一次显示货币选择

- **WHEN** 用户在 Dashboard 将货币下拉切换到 USD，随后刷新页面或重新进入网站
- **THEN** Dashboard 继续显示 USD 为当前选中项，而不是回退到默认

#### Scenario: Dashboard 修改后账户页跟随

- **WHEN** 用户在 Dashboard 将货币下拉切换到 HKD，然后进入账户页
- **THEN** 账户页金额展示按 HKD 实时换算显示，无需用户再次设置

### Requirement: Dashboard 导航

系统 SHALL 在 Dashboard header 区域保留标题，并在右侧提供“货币视图”下拉框与「更新股价」按钮；下拉框 MUST 放置在「更新股价」按钮左侧，并固定提供“默认、USD、CNY、HKD”四个选项。系统 MUST 不显示「记录净值」手动按钮。点击「更新股价」后调用 `POST /api/holdings/fetch-prices` 的手动模式，显示加载状态，完成后展示逐条结果明细弹窗并刷新页面数据。完整数据导出入口 MUST 放置在设置面板中，而不是 Dashboard header。

#### Scenario: Dashboard header 布局

- **WHEN** 用户打开 Dashboard
- **THEN** header 区域显示标题、货币视图下拉框和「更新股价」按钮，不显示「记录净值」按钮，也不显示完整数据导出按钮

#### Scenario: 货币视图下拉显示固定选项

- **WHEN** 用户展开 Dashboard header 的货币下拉框
- **THEN** 下拉框显示“默认、USD、CNY、HKD”四个选项

#### Scenario: 点击手动更新股价

- **WHEN** 用户在 Dashboard 点击「更新股价」按钮
- **THEN** 按钮显示加载状态，调用手动模式报价同步接口，完成后弹出逐条明细结果并刷新页面资产数据
