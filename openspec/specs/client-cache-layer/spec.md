## Purpose

定义全局客户端缓存层能力的业务约束与验收标准。

## Requirements

### Requirement: 全局客户端缓存策略配置

系统 SHALL 提供统一的缓存策略配置文件，集中定义各查询键（query key）的缓存时效、持久化时效、刷新策略和写操作失效映射。全局默认策略 MUST 为 `staleTime=60s` 与 `persistTime=3d`。

#### Scenario: 策略集中管理

- **WHEN** 开发者需要调整任意页面的数据缓存策略
- **THEN** 仅需修改统一策略配置文件即可生效，而非分散修改多个页面组件

#### Scenario: 默认时效固定

- **WHEN** 系统初始化客户端缓存层
- **THEN** 若未单独覆盖，查询策略默认使用 `staleTime=60s` 与 `persistTime=3d`

### Requirement: 缓存优先读取与条件后台刷新

系统 SHALL 在业务页面读取数据时优先返回本地缓存，并基于缓存年龄决定是否发起后台刷新。缓存在 `persistTime` 失效前 MUST 允许直接展示给用户。

#### Scenario: 60秒内命中缓存

- **WHEN** 查询命中缓存且缓存年龄小于或等于 60 秒
- **THEN** 系统立即展示缓存数据，且不触发异步远端刷新

#### Scenario: 60秒后命中缓存

- **WHEN** 查询命中缓存且缓存年龄大于 60 秒且小于 3 天
- **THEN** 系统先展示缓存数据，并异步请求远端最新数据

#### Scenario: 持久化过期

- **WHEN** 查询缓存年龄大于或等于 3 天
- **THEN** 系统将该缓存视为失效并走远端请求流程

### Requirement: 后台刷新无整页打断

系统 SHALL 在后台刷新成功后仅更新页面数值状态，不执行整页刷新或回退到全页 Loading。

#### Scenario: 后台刷新成功

- **WHEN** 页面处于缓存展示状态且异步远端请求成功返回
- **THEN** 系统在当前页面上下文中更新相关数值，页面布局与交互状态保持不变

### Requirement: 后台刷新失败通知条

系统 SHALL 在“缓存已展示且后台刷新失败”时显示全局通知条，通知条 MUST 自动缓慢淡出并消失，不阻塞用户当前操作。

#### Scenario: 刷新失败提示

- **WHEN** 页面已展示缓存数据且异步远端刷新请求失败
- **THEN** 显示“更新数据失败”通知条，并在短暂停留后缓慢自动消失

### Requirement: 用户隔离与安全清理

系统 SHALL 以 `userId` 维度隔离缓存键；在登出或接口返回 401 时 MUST 清理当前用户缓存，防止跨用户数据残留。

#### Scenario: 多用户缓存隔离

- **WHEN** 同一浏览器存在不同登录用户会话
- **THEN** 不同用户读取到的缓存数据彼此隔离，不能互相复用

#### Scenario: 登录态失效清理

- **WHEN** 任意受保护查询请求返回 401
- **THEN** 系统清理当前用户相关缓存并执行未登录处理流程

### Requirement: 写操作统一失效与跨标签页同步

系统 SHALL 在写操作成功后按统一映射失效相关查询缓存，并通过跨标签页通信机制同步失效事件。

#### Scenario: 当前标签页写后失效

- **WHEN** 用户完成账户、持仓或交易等写操作
- **THEN** 系统按配置映射失效关联查询键，后续读取触发重新获取最新数据

#### Scenario: 多标签页一致性

- **WHEN** 用户在 A 标签页完成写操作
- **THEN** B 标签页接收失效信号并对对应查询键执行一致的失效处理

### Requirement: 写操作乐观更新与失败回滚

系统 SHALL 支持账户、持仓、交易等核心写操作的乐观更新：在 mutation 发起时取消相关进行中查询、快照旧缓存，并即时将预期结果写入本地查询缓存。若服务端请求失败，系统 MUST 用快照回滚所有被修改的查询缓存，并通过全局失败通知条告知用户该操作未保存。乐观结果仅为本地预测，服务端数据 MUST 作为最终权威。

#### Scenario: 写操作即时可见

- **WHEN** 用户新增、编辑、删除账户/持仓，或新增、删除交易
- **THEN** 系统在服务端请求完成前更新 `accounts`、`holdings`、`transactions` 等相关本地缓存，使页面即时反映预期结果

#### Scenario: 失败后回滚旧值

- **WHEN** 已应用乐观更新的写操作请求失败
- **THEN** 系统将所有被乐观修改的查询缓存恢复到 mutation 发起前的快照，并显示“操作未保存，已回滚到本地缓存”类失败提示

#### Scenario: 结束后服务端校准

- **WHEN** 乐观写操作进入 settled 阶段
- **THEN** 系统按 `MUTATION_INVALIDATES` 失效相关查询并广播失效事件，确保临时 ID 与本地预测结果被服务端真实数据替换

#### Scenario: 未配置乐观更新的写操作保持兼容

- **WHEN** 某写操作未提供乐观更新配置
- **THEN** 系统仍沿用成功后失效查询的既有行为，不强制执行乐观缓存写入

### Requirement: 净值列表与图表使用独立参数化缓存键

系统 SHALL 将净值历史列表与净值图表拆分为两个独立的客户端查询键：`netvalue-list` 与 `netvalue-chart`。系统 MUST 将分页参数纳入 `netvalue-list` 的 query key，将图区间与实际粒度参数纳入 `netvalue-chart` 的 query key，避免分页缓存与图区间缓存互相覆盖。

#### Scenario: 不同分页结果独立缓存

- **WHEN** 用户先后读取 `GET /api/netvalue/list?page=1&pageSize=30` 与 `GET /api/netvalue/list?page=2&pageSize=30`
- **THEN** 系统为两次请求分别维护独立缓存，不得让第二页结果覆盖第一页缓存

#### Scenario: 不同图区间结果独立缓存

- **WHEN** 用户先后读取 `GET /api/netvalue/chart?range=30d` 与 `GET /api/netvalue/chart?range=1y`
- **THEN** 系统为两次图表请求分别维护独立缓存，不得让 `30d` 与 `1y` 图表数据互相污染

### Requirement: 洞察页使用用户隔离缓存键

系统 SHALL 为 `/api/insights` 提供独立的 `insights` 客户端查询键，并沿用全局默认缓存策略：`staleTime=60s`、`persistTime=3d`。账户、持仓、交易、设置与报价刷新等会改变洞察快照的写操作成功后，系统 MUST 失效当前用户的 `insights` 查询。

#### Scenario: 洞察页命中缓存

- **WHEN** 用户打开 `/insights` 且存在当前用户未过期的 `insights` 缓存
- **THEN** 页面优先展示缓存数据，并按全局条件刷新策略决定是否后台请求最新洞察数据

#### Scenario: 持仓写操作后失效洞察

- **WHEN** 用户新增、编辑、删除持仓或执行会影响持仓的交易
- **THEN** 系统失效当前用户的 `insights` 查询，后续进入洞察页读取最新快照

#### Scenario: 报价刷新后失效洞察

- **WHEN** 用户手动、静默或 Cron 链路完成报价刷新
- **THEN** 系统失效当前用户的 `insights` 查询，确保热力图与占比图可读取最新市值

### Requirement: 净值查询使用长时 stale 策略并保持写后失效

系统 SHALL 为 `netvalue-list`、`netvalue-chart` 与 `netvalue-performance` 提供独立于全局默认值的缓存覆盖策略，统一使用 `staleTime=60m` 与现有 `persistTime=3d`。在缓存未过期时，系统 MUST 允许直接展示本地持久化结果；一旦发生会影响净值、收益率市值序列、外部现金流或业绩起算日的写操作成功事件，系统 MUST 同时失效 `netvalue-list`、`netvalue-chart` 与 `netvalue-performance` 查询，并继续沿用现有跨标签页失效同步机制。

#### Scenario: 60 分钟内命中净值列表缓存

- **WHEN** `netvalue-list` 查询命中缓存且缓存年龄小于或等于 60 分钟
- **THEN** 系统立即展示缓存结果，且不触发异步远端刷新

#### Scenario: 60 分钟后命中净值图表缓存

- **WHEN** `netvalue-chart` 查询命中缓存且缓存年龄大于 60 分钟且小于 3 天
- **THEN** 系统先展示缓存结果，并异步请求远端最新图表数据

#### Scenario: 收益率曲线缓存使用长时策略

- **WHEN** `netvalue-performance` 查询命中缓存且缓存年龄小于或等于 60 分钟
- **THEN** 系统立即展示缓存结果，且不触发异步远端刷新

#### Scenario: 净值相关写操作后统一失效

- **WHEN** 用户完成会触发净值更新的账户、持仓、交易或股价刷新写操作
- **THEN** 系统同时失效当前用户的 `netvalue-list`、`netvalue-chart` 与 `netvalue-performance` 查询，并向其他标签页广播相同的失效事件

#### Scenario: 业绩起算日设置后失效收益率

- **WHEN** 用户保存 `performance.start_date`
- **THEN** 系统失效当前用户的 `netvalue-performance` 查询

### Requirement: 低侵入数据新鲜度展示

系统 SHALL 在页面不显眼位置以小字号展示数据新鲜度（如更新时间或缓存年龄），且不应打断主流程。

#### Scenario: 展示新鲜度信息

- **WHEN** 页面显示缓存或远端数据
- **THEN** 页面在低视觉权重位置显示对应数据更新时间或缓存年龄

### Requirement: 本地图表范围偏好缓存

系统 SHALL 允许前端将纯 UI 偏好持久化到浏览器本地存储，且该偏好 MUST 与服务端查询结果缓存分离。总览资产趋势图的范围选择 MUST 使用该本地偏好机制保存最近一次有效选择；保存和读取该偏好不得影响 TanStack Query 的 `netvalue-chart` 数据缓存键、失效策略或持久化时效。

#### Scenario: 图表范围偏好不污染查询缓存

- **WHEN** 用户在总览页切换资产趋势图范围
- **THEN** 系统将范围偏好写入浏览器本地存储，同时 `netvalue-chart` 查询仍按当前 range 使用独立 query key 缓存服务端数据

#### Scenario: 本地偏好不写入数据库

- **WHEN** 用户切换总览资产趋势图范围
- **THEN** 系统不得调用设置保存接口或写入数据库，仅更新浏览器本地存储

### Requirement: 会话初始化阶段避免失败态闪烁

系统 SHALL 在依赖登录态的查询页面中，将 `sessionStatus=loading` 视为加载中状态。在会话未就绪阶段，页面 MUST NOT 渲染“加载失败/暂无数据”等终态错误文案。

#### Scenario: 会话加载中进入页面

- **WHEN** 用户首次进入受保护页面且会话状态为 `loading`
- **THEN** 页面显示加载占位，不显示错误态或空状态

#### Scenario: 会话就绪后再判定错误

- **WHEN** 会话状态已就绪且查询请求实际失败
- **THEN** 页面按真实请求结果展示错误信息
