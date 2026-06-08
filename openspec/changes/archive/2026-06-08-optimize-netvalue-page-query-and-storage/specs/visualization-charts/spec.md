## ADDED Requirements

### Requirement: 净值图表固定区间切换

系统 SHALL 在净值页为图表提供固定区间选项 `30d`、`90d`、`1y`、`3y` 与 `all`。系统 MUST 按以下固定映射决定图表粒度，且前端 MUST NOT 提供独立的手动粒度切换入口：

- `30d -> day`
- `90d -> day`
- `1y -> week`
- `3y -> month`
- `all -> month`

#### Scenario: 选择 30d 区间

- **WHEN** 用户将净值图表区间切换为 `30d`
- **THEN** 系统使用 `day` 粒度返回并展示最近 30 天的净值图表数据

#### Scenario: 选择 1y 区间

- **WHEN** 用户将净值图表区间切换为 `1y`
- **THEN** 系统使用 `week` 粒度返回并展示最近 1 年的净值图表数据

## MODIFIED Requirements

### Requirement: 总资产历史走势折线图

系统 SHALL 在净值历史页顶部展示总资产走势折线图，并通过独立的 `GET /api/netvalue/chart` 端点读取当前区间所需数据，而不是复用历史列表分页数据。X 轴 SHALL 使用服务端返回的聚合时间点，Y 轴为总资产金额（CNY）。当区间映射为 `day` 时，系统 MUST 返回日级净值；当区间映射为 `week` 或 `month` 时，系统 MUST 返回每个周期“最后一个可用净值记录”的期末值，而不是周期平均值。折线图 SHALL 支持 Tooltip 显示具体日期标签和金额。当图表数据少于 2 条时不显示图表。

#### Scenario: 查看 90 天资产走势

- **WHEN** 用户打开净值历史页并选择 `90d` 区间，存在足够的净值数据
- **THEN** 页面通过 `GET /api/netvalue/chart?range=90d` 获取日级数据，并显示最近 90 天的总资产折线图

#### Scenario: 查看 1 年资产走势

- **WHEN** 用户打开净值历史页并选择 `1y` 区间，存在足够的净值数据
- **THEN** 页面通过 `GET /api/netvalue/chart?range=1y` 获取周级期末值数据，并显示最近 1 年的总资产折线图

#### Scenario: 数据不足

- **WHEN** 图表接口返回的总资产数据少于 2 条
- **THEN** 不显示折线图

### Requirement: 资产类别占比堆叠面积图

系统 SHALL 在净值历史页的走势折线图下方展示资产类别占比堆叠面积图，并与总资产折线图复用同一个 `GET /api/netvalue/chart` 响应。X 轴 SHALL 使用服务端返回的聚合时间点，Y 轴为百分比（0-100%），每个资产类别用一致的颜色填充对应区域。当区间映射为 `week` 或 `month` 时，系统 MUST 使用与总资产折线图相同的“周期最后一个可用净值记录”作为该时间点的资产占比快照。当前端拿到的图表数据少于 2 条时不显示图表。

#### Scenario: 查看 30 天占比变化趋势

- **WHEN** 用户打开净值历史页并选择 `30d` 区间，存在足够的净值数据
- **THEN** 页面通过 `GET /api/netvalue/chart?range=30d` 获取日级资产占比数据，并显示堆叠面积图

#### Scenario: 查看全部历史占比变化趋势

- **WHEN** 用户打开净值历史页并选择 `all` 区间，存在足够的净值数据
- **THEN** 页面通过 `GET /api/netvalue/chart?range=all` 获取月级期末值占比数据，并显示全部历史的堆叠面积图

#### Scenario: 数据不足

- **WHEN** 图表接口返回的资产占比数据少于 2 条
- **THEN** 不显示堆叠面积图
