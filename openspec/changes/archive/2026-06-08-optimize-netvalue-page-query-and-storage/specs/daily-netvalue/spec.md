## ADDED Requirements

### Requirement: 净值历史列表分页查询

系统 SHALL 提供独立的 `GET /api/netvalue/list` 端点，按当前登录用户返回净值历史分页结果。该接口 MUST 按 `date` 倒序排列，默认 `page=1`、`pageSize=30`，并支持继续读取更早页的数据。响应 MUST 返回分页元数据，至少包含 `page`、`pageSize`、`total`、`hasMore` 与当前页记录列表。

#### Scenario: 默认读取第一页

- **WHEN** 已登录用户请求 `GET /api/netvalue/list` 且未显式传入分页参数
- **THEN** 系统返回该用户最近 `30` 条净值记录，按日期倒序排列，并返回 `page=1`、`pageSize=30`

#### Scenario: 读取更早页数据

- **WHEN** 已登录用户请求 `GET /api/netvalue/list?page=2&pageSize=30`
- **THEN** 系统返回该用户第 2 页的 `30` 条更早净值记录，且不得重复第一页已返回的记录

#### Scenario: 分页元数据反映是否还有更多记录

- **WHEN** 已登录用户请求任意一页净值列表
- **THEN** 系统返回 `total` 与 `hasMore`，使前端能够判断是否继续翻页

#### Scenario: 未登录用户访问列表接口

- **WHEN** 未登录用户请求 `GET /api/netvalue/list`
- **THEN** 系统返回 401

### Requirement: 精简净值快照持久化结构

系统 SHALL 将新写入或同日覆盖写入的 `netvalue.dataJson` 精简为仅包含 `allocation` 与 `rates`。系统 MUST NOT 在新的净值快照中继续持久化 `accounts` 字段。对于历史上仍包含 `accounts` 的旧净值记录，系统 MUST 保持可读并在读取时忽略该冗余字段，不得因为新旧结构混用导致列表或图表接口失败。

#### Scenario: 新净值记录写入瘦身结构

- **WHEN** 系统为某用户创建或覆盖当日净值记录
- **THEN** 持久化的 `dataJson` 只包含 `allocation` 与 `rates`，且不包含 `accounts`

#### Scenario: 历史旧结构仍可读取

- **WHEN** 某条历史净值记录的 `dataJson` 同时包含 `allocation`、`rates` 与旧的 `accounts`
- **THEN** 系统仍可正常返回该记录的列表或图表所需数据，且不会因存在 `accounts` 字段报错
