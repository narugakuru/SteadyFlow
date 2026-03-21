## MODIFIED Requirements

### Requirement: 指数行情表格展示

系统 SHALL 在市场页顶部 VIX 区域下方展示全球主要指数表格，按市场分组（美股、A股、港股、日股）。表格结构（指数名称、外部查看链接）始终显示，不依赖 API 数据。价格、涨跌、涨跌幅和更新时间通过市场聚合接口动态填充；任一指数快照缺失时，该行显示 `--` 兜底。VIX 不再作为表格中的独立“波动率”分组展示。

#### Scenario: 正常数据展示

- **WHEN** 用户打开市场页且市场聚合接口成功返回指数快照
- **THEN** 已成功获取的指数显示名称、最新价、涨跌、涨跌幅、更新时间和外部查看链接，且页面只展示美股、A股、港股、日股四个分组

#### Scenario: 部分指数失败时的兜底展示

- **WHEN** 用户打开市场页且只有部分指数快照获取成功
- **THEN** 成功的指数正常显示数据，失败的指数行保留名称和外部查看链接，其余字段显示 `--`

#### Scenario: 加载中状态

- **WHEN** 用户打开市场页且市场聚合接口仍在加载
- **THEN** 指数表格骨架正常显示，价格相关列显示加载占位符动画

### Requirement: 数据获取使用双数据源（Stooq + Tencent）

系统 SHALL 使用 Stooq 和 Tencent 作为市场页数据聚合的双数据源。每个指数或资产配置 MUST 显式声明快照源和历史源；其中 Tencent 用于 A 股与港股核心指数快照，Stooq 用于美股、日股、VIX 及可用的全球基准历史数据。`/api/market` SHALL 一次返回指数表格快照、VIX 数据和 ATH 回撤摘要；任一源请求失败时 MUST NOT 影响其他源的结果。

#### Scenario: 正常获取数据（双源）

- **WHEN** API 路由收到市场数据请求且 Stooq、Tencent 都可用
- **THEN** 系统按配置的快照源和历史源聚合数据，并返回包含 `indices`、`vix`、`athDrawdowns` 的完整响应

#### Scenario: Stooq 失败但 Tencent 正常

- **WHEN** Stooq 请求超时或返回空数据，但 Tencent 正常返回
- **THEN** 依赖 Stooq 的指数与历史摘要显示 `--` 或空序列，A 股与港股快照仍正常返回

#### Scenario: Tencent 失败但 Stooq 正常

- **WHEN** Tencent 请求失败，但 Stooq 正常返回
- **THEN** 依赖 Tencent 的 A 股与港股指数显示 `--`，Stooq 覆盖的指数、VIX 和其他历史摘要仍正常返回

#### Scenario: 无可用历史源的跟踪项

- **WHEN** 某个 ATH 跟踪项已配置展示，但其历史源暂时无法返回有效序列
- **THEN** API 仍返回该项的名称和顺序信息，并将历史高点日期与回撤字段置为空值供前端显示 `--`

## RENAMED Requirements

### Requirement: 数据获取使用双数据源（Stooq + Yahoo）

- FROM: `数据获取使用双数据源（Stooq + Yahoo）`
- TO: `数据获取使用双数据源（Stooq + Tencent）`
