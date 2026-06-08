## ADDED Requirements

### Requirement: 净值列表与图表使用独立参数化缓存键

系统 SHALL 将净值历史列表与净值图表拆分为两个独立的客户端查询键：`netvalue-list` 与 `netvalue-chart`。系统 MUST 将分页参数纳入 `netvalue-list` 的 query key，将图区间与实际粒度参数纳入 `netvalue-chart` 的 query key，避免分页缓存与图区间缓存互相覆盖。

#### Scenario: 不同分页结果独立缓存

- **WHEN** 用户先后读取 `GET /api/netvalue/list?page=1&pageSize=30` 与 `GET /api/netvalue/list?page=2&pageSize=30`
- **THEN** 系统为两次请求分别维护独立缓存，不得让第二页结果覆盖第一页缓存

#### Scenario: 不同图区间结果独立缓存

- **WHEN** 用户先后读取 `GET /api/netvalue/chart?range=30d` 与 `GET /api/netvalue/chart?range=1y`
- **THEN** 系统为两次图表请求分别维护独立缓存，不得让 `30d` 与 `1y` 图表数据互相污染

### Requirement: 净值查询使用长时 stale 策略并保持写后失效

系统 SHALL 为 `netvalue-list` 与 `netvalue-chart` 提供独立于全局默认值的缓存覆盖策略，统一使用 `staleTime=60m` 与现有 `persistTime=3d`。在缓存未过期时，系统 MUST 允许直接展示本地持久化结果；一旦发生会影响净值的写操作成功事件，系统 MUST 同时失效 `netvalue-list` 与 `netvalue-chart` 两类查询，并继续沿用现有跨标签页失效同步机制。

#### Scenario: 60 分钟内命中净值列表缓存

- **WHEN** `netvalue-list` 查询命中缓存且缓存年龄小于或等于 60 分钟
- **THEN** 系统立即展示缓存结果，且不触发异步远端刷新

#### Scenario: 60 分钟后命中净值图表缓存

- **WHEN** `netvalue-chart` 查询命中缓存且缓存年龄大于 60 分钟且小于 3 天
- **THEN** 系统先展示缓存结果，并异步请求远端最新图表数据

#### Scenario: 净值相关写操作后统一失效

- **WHEN** 用户完成会触发净值更新的账户、持仓、交易或股价刷新写操作
- **THEN** 系统同时失效当前用户的 `netvalue-list` 与 `netvalue-chart` 查询，并向其他标签页广播相同的失效事件
