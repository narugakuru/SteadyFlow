## ADDED Requirements

### Requirement: 本地图表范围偏好缓存

系统 SHALL 允许前端将纯 UI 偏好持久化到浏览器本地存储，且该偏好 MUST 与服务端查询结果缓存分离。总览资产趋势图的范围选择 MUST 使用该本地偏好机制保存最近一次有效选择；保存和读取该偏好不得影响 TanStack Query 的 `netvalue-chart` 数据缓存键、失效策略或持久化时效。

#### Scenario: 图表范围偏好不污染查询缓存

- **WHEN** 用户在总览页切换资产趋势图范围
- **THEN** 系统将范围偏好写入浏览器本地存储，同时 `netvalue-chart` 查询仍按当前 range 使用独立 query key 缓存服务端数据

#### Scenario: 本地偏好不写入数据库

- **WHEN** 用户切换总览资产趋势图范围
- **THEN** 系统不得调用设置保存接口或写入数据库，仅更新浏览器本地存储
