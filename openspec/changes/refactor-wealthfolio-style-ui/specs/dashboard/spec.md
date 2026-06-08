## ADDED Requirements

### Requirement: 总览资产趋势图

总览页 SHALL 在首屏核心区域展示 Wealthfolio 风格的绿色填充资产趋势图，并保持原有白色浅色主题与现有配色。该图表 MUST 使用现有净值历史图表数据作为资产价值趋势来源，并明确表示资产曲线而非历史盈亏曲线。图表可使用稍深绿色线条与浅绿填充，但 MUST NOT 显示收益 0 水平线。图表下方 SHALL 提供时间范围切换控件，首版范围复用现有净值图表范围：`30d`、`90d`、`1y`、`3y`、`all`。

#### Scenario: 展示资产趋势图

- **WHEN** 用户打开总览页且净值历史存在至少两个图表点
- **THEN** 页面展示绿色填充的资产趋势图，走势基于净值历史总资产数据

#### Scenario: 数据不足时兜底

- **WHEN** 净值历史图表数据少于两个点
- **THEN** 总览图表区域显示当前资产摘要和空状态，不绘制误导性趋势线

#### Scenario: 切换图表范围

- **WHEN** 用户在总览图表下方切换到 `1y`
- **THEN** 页面使用 `GET /api/netvalue/chart?range=1y` 的数据刷新资产趋势图

#### Scenario: 不标记为盈亏曲线

- **WHEN** 用户查看总览图表
- **THEN** 图表文案不得将该曲线称为历史盈亏、TWR、IRR 或投资业绩曲线，且不显示收益 0 水平线

### Requirement: 总览当前盈亏百分比

总览页 SHALL 在资产趋势图左上区域展示总资产金额、账户总盈亏金额和账户总盈亏百分比。账户总盈亏金额 MUST 使用现有 `totalPnl = realizedPnl + unrealizedPnl` 口径；账户总盈亏百分比 MUST 作为当前快照指标展示，计算基准为 `estimatedPrincipalCny = totalAssetCny - totalPnl`。当基准无效或小于等于 0 时，百分比 MUST 显示为 `--`。

#### Scenario: 展示当前总盈亏百分比

- **WHEN** `totalAssetCny=110000` 且 `totalPnl=10000`
- **THEN** 总览页显示账户总盈亏百分比约为 `10%`

#### Scenario: 盈亏百分比分母无效

- **WHEN** `totalAssetCny - totalPnl <= 0`
- **THEN** 账户总盈亏百分比显示为 `--`

#### Scenario: 当前快照而非历史收益

- **WHEN** 用户查看总览盈亏百分比
- **THEN** 页面不得将该百分比标记为 TWR、IRR、年化收益或历史收益率

## MODIFIED Requirements

### Requirement: 总资产区收益拆解展示

系统 SHALL 在总览核心资产区域展示账户总盈亏信息，至少包含账户总盈亏金额与账户总盈亏百分比。账户总盈亏金额 MUST 实时计算为 `持仓盈亏 + 了结盈亏`，不得作为独立持久化字段存储。持仓盈亏与了结盈亏可以作为次级信息展示，但总览首要展示重点 SHALL 是总资产与账户总盈亏。

#### Scenario: 总览核心区展示账户总盈亏

- **WHEN** 用户打开 Dashboard 且总资产数据加载完成
- **THEN** 总览核心区显示账户总盈亏金额与账户总盈亏百分比

#### Scenario: 账户总盈亏实时计算

- **WHEN** 当前用户持仓盈亏为 `8000`，了结盈亏为 `3500`
- **THEN** 页面展示账户总盈亏为 `11500`

#### Scenario: 无交易或无持仓时显示

- **WHEN** 当前用户没有卖出交易且没有浮动盈亏
- **THEN** 账户总盈亏金额显示为 `0`，账户总盈亏百分比按有效分母计算或显示为 `--`

### Requirement: Dashboard 布局

系统 SHALL 调整 Dashboard/总览布局为：资产趋势图核心区域 + 图表时间范围控件 + 资产配置纪律表（含可展开的类别详情）+ 再平衡建议。所有数据 MUST 限定为当前用户的数据。Dashboard 默认不再展示资产分布饼图，不显示账户列表，不显示市场页内容，不显示股价更新页内容。

#### Scenario: Dashboard 默认展示

- **WHEN** 已登录用户打开 Dashboard（/）
- **THEN** 页面从上到下依次显示：资产趋势图核心区域、时间范围控件、资产配置纪律表、再平衡建议。不显示资产分布饼图，不显示账户列表，不显示其他用户的数据

### Requirement: Dashboard 导航

系统 SHALL 在 Dashboard/总览中保留必要的全局显示货币控制与手动报价刷新能力，但这些操作 MUST 作为总览辅助操作展示，不得恢复独立的“股价更新”页面入口。完整数据导出入口 MUST 继续放置在设置面板中，而不是 Dashboard header。

#### Scenario: Dashboard 操作入口

- **WHEN** 用户打开 Dashboard
- **THEN** 页面提供货币视图控制和手动更新股价操作，但不显示“股价更新”页面入口

#### Scenario: 点击手动更新股价

- **WHEN** 用户在 Dashboard 点击手动更新股价操作
- **THEN** 系统调用手动模式报价同步接口，完成后展示逐条结果并刷新页面数据
