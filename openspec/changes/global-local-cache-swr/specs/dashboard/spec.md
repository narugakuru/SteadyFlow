## ADDED Requirements

### Requirement: Dashboard 缓存优先展示与条件刷新

Dashboard 页面 SHALL 使用全局客户端缓存层读取资产配置数据，并遵循统一时效策略：`staleTime=60s`、`persistTime=3d`。在持久化失效前，缓存数据 MUST 优先展示给用户。

#### Scenario: Dashboard 60秒内命中缓存

- **WHEN** 用户进入 Dashboard 且命中缓存，缓存年龄小于或等于 60 秒
- **THEN** 页面立即展示缓存数据，且不触发异步远端刷新

#### Scenario: Dashboard 60秒后命中缓存

- **WHEN** 用户进入 Dashboard 且命中缓存，缓存年龄大于 60 秒且小于 3 天
- **THEN** 页面先展示缓存数据，再异步请求远端数据并更新页面数值

#### Scenario: Dashboard 持久化缓存过期

- **WHEN** 用户进入 Dashboard 且缓存年龄大于或等于 3 天
- **THEN** 页面不使用过期缓存作为命中数据，按远端请求流程加载

### Requirement: Dashboard 后台刷新失败提示

Dashboard 在已展示缓存数据的前提下，若后台刷新失败 SHALL 显示全局失败通知条，通知条 MUST 自动缓慢淡出消失，且页面保持当前可用数据。

#### Scenario: Dashboard 异步刷新失败

- **WHEN** Dashboard 已展示缓存数据且后台请求失败
- **THEN** 显示“更新数据失败”通知条，随后自动缓慢消失，并继续保留当前缓存展示

## MODIFIED Requirements

### Requirement: Dashboard 使用 LoadingSpinner 加载动画

Dashboard 页面 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，但仅在“无可用缓存且远端数据尚未返回”时展示全页加载动画。

#### Scenario: Dashboard 无缓存时加载中

- **WHEN** Dashboard 页面正在获取资产配置数据，且本地无可用缓存
- **THEN** 页面显示 LoadingSpinner 组件（带"加载中..."文字），替代原有纯文本

#### Scenario: Dashboard 有缓存时进入页面

- **WHEN** Dashboard 页面存在未过 `persistTime` 的本地缓存
- **THEN** 页面优先显示缓存数据，不进入全页 LoadingSpinner 阶段
