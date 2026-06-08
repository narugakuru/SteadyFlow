## ADDED Requirements

### Requirement: Dashboard 总览支持临时货币视图

系统 SHALL 在 Dashboard 中维护一个仅当前页面有效的临时货币视图状态，用于驱动总资产卡片、纪律表、资产分布图 tooltip 与再平衡建议的金额展示。该状态默认值 MUST 为“默认”，并在每次重新进入网站时恢复为默认，不得写入数据库或本地存储。

#### Scenario: 首次进入页面默认使用默认视图

- **WHEN** 用户首次进入 Dashboard
- **THEN** 货币视图默认为“默认”，总资产卡片金额显示为 CNY，纪律表持仓明细保持原币显示

#### Scenario: 切换币种仅影响当前页面会话

- **WHEN** 用户将货币视图切换到 USD 后刷新页面或重新进入网站
- **THEN** Dashboard 再次恢复为“默认”视图，而不是保留上一次的 USD 选择

### Requirement: Dashboard 纪律区快捷交易按钮

系统 SHALL 在 Dashboard 的“资产配置纪律”标题区域提供一个“交易”按钮，并将其放置在“导出持仓”按钮左侧。点击后 MUST 打开通用交易弹窗，默认交易类型为买入，且默认不选择账户与持仓。

#### Scenario: 纪律区显示交易按钮

- **WHEN** 用户打开 Dashboard
- **THEN** “资产配置纪律”标题区域显示“交易”按钮，位置在“导出持仓”按钮左侧

#### Scenario: 点击交易按钮打开空上下文表单

- **WHEN** 用户点击 Dashboard 纪律区的“交易”按钮
- **THEN** 系统打开交易弹窗，默认类型为“买入”，账户与持仓选择框保持未选中状态

## MODIFIED Requirements

### Requirement: Dashboard 导航

系统 SHALL 在 Dashboard header 区域保留标题，并在右侧提供“货币视图”下拉框与「更新股价」按钮；下拉框 MUST 放置在「更新股价」按钮左侧，并基于当前账户币种动态列出“默认 + 账户里存在的币种”。系统 MUST 不显示「记录净值」手动按钮。点击「更新股价」后调用 `POST /api/holdings/fetch-prices` 的手动模式，显示加载状态，完成后展示逐条结果明细弹窗并刷新页面数据。完整数据导出入口 MUST 放置在设置面板中，而不是 Dashboard header。

#### Scenario: Dashboard header 布局

- **WHEN** 用户打开 Dashboard
- **THEN** header 区域显示标题、货币视图下拉框和「更新股价」按钮，不显示「记录净值」按钮，也不显示完整数据导出按钮

#### Scenario: 货币视图下拉列出账户币种

- **WHEN** 当前用户账户包含 CNY、USD 与 HKD 三种币种
- **THEN** Dashboard header 的下拉框显示“默认、人民币、美元、港币”四个选项

#### Scenario: 点击手动更新股价

- **WHEN** 用户在 Dashboard 点击「更新股价」按钮
- **THEN** 按钮显示加载状态，调用手动模式报价同步接口，完成后弹出逐条明细结果并刷新页面资产数据
