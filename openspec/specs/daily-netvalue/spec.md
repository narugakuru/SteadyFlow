## Purpose

定义 daily-netvalue 能力的业务约束与验收标准。

## Requirements

### Requirement: 自动创建每日净值

系统 SHALL 支持在已登录用户访问应用或每日任务触发时自动创建或刷新该用户“当日净值”记录；当日日期 MUST 基于用户净值时区计算（默认 `Asia/Shanghai`），并以 `(userId, date)` 作为唯一键进行幂等写入（同日覆盖更新，不重复新增）。

#### Scenario: 当天首次打开应用

- **WHEN** 用户当日首次打开应用，数据库中无该用户该业务日期的净值记录
- **THEN** 系统自动创建当日净值记录，且 `userId` 为当前用户

#### Scenario: 用户不登录也会记录当日净值

- **WHEN** 用户当天没有登录或进行任何手动操作，但每日 Cron 成功执行
- **THEN** 系统仍为该用户写入或刷新该业务日期的净值记录

#### Scenario: 同日重复触发幂等

- **WHEN** 同一用户在同一业务日期内多次触发净值记录
- **THEN** 系统仅更新该用户当日净值记录，不新增第二条

#### Scenario: 不同用户同日净值独立

- **WHEN** 用户 A 和用户 B 在同一天分别触发净值记录
- **THEN** 系统分别写入各自的净值记录，互不影响

#### Scenario: 日期按用户时区计算

- **WHEN** 用户时区与服务器时区不一致
- **THEN** 系统按用户时区确定 `date`，而不是按服务器本地或 UTC 直接截断

### Requirement: 净值数据内容

净值页中的数值展示 SHALL 满足以下规则：

- 总资产金额：显示为货币金额并固定 2 位小数（例如 `¥500,000.00`）
- 各资产类别列：每个单元格显示两行内容，第一行为该类别金额，第二行为该类别占比（`%`），两者均固定 2 位小数

#### Scenario: 净值总资产显示

- **WHEN** 净值记录总资产为 500000
- **THEN** 显示为 `¥500,000.00`

#### Scenario: 净值总资产有小数

- **WHEN** 净值记录总资产为 500000.5
- **THEN** 显示为 `¥500,000.50`

#### Scenario: 资产类别单元格双行显示

- **WHEN** 净值记录包含“股票”类别，`actualValue=120000`，`actualPct=24.5`
- **THEN** “股票”列显示两行：`¥120,000.00` 与 `24.50%`

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

### Requirement: 资产写操作自动触发净值刷新

系统 SHALL 在影响资产状态的写操作成功后自动触发当日净值记录，包括账户、持仓、交易与批量股价更新等 mutation 接口。自动触发 SHOULD 通过统一封装执行，避免路由分散实现。

#### Scenario: 持仓更新后自动刷新净值

- **WHEN** 用户成功更新某持仓市值/股价
- **THEN** 系统在该写操作成功返回前后自动触发当日净值刷新

#### Scenario: 交易创建后自动刷新净值

- **WHEN** 用户成功创建一笔会影响资产数值的交易记录
- **THEN** 系统自动刷新该用户当日净值记录

#### Scenario: 批量更新股价后自动刷新净值

- **WHEN** 用户执行批量股价更新且至少一条持仓更新成功
- **THEN** 系统自动刷新该用户当日净值记录

### Requirement: 用户可配置净值时区

系统 SHALL 允许用户手动设置净值业务时区。系统在用户未设置时 MUST 使用 `Asia/Shanghai` 作为默认时区。

#### Scenario: 用户未设置时区

- **WHEN** 用户未保存任何净值时区设置
- **THEN** 系统按 `Asia/Shanghai` 计算净值业务日期

#### Scenario: 用户设置有效时区

- **WHEN** 用户将净值时区设置为有效 IANA 时区（如 `America/New_York`）
- **THEN** 系统后续按该时区计算当日净值日期

### Requirement: 每日 Cron 固定一次记录净值

系统 SHALL 提供定时任务能力，每日固定调度一次 `POST /api/cron/netvalue` 扫描并处理所有用户。定时任务 MUST 具备鉴权与幂等保护，且净值业务日期仍按用户净值时区计算。

#### Scenario: 每日固定一次调度

- **WHEN** 平台到达配置的每日 Cron 时间
- **THEN** 系统触发一次 `/api/cron/netvalue` 任务，不依赖用户手动登录

#### Scenario: 扫描用户并逐个尝试写入

- **WHEN** Cron 任务开始执行且系统存在多个用户
- **THEN** 系统扫描全部用户并逐个尝试写入当日净值，返回扫描与执行统计

#### Scenario: 同日重复调度幂等

- **WHEN** 同一用户在同一业务日期内因重试或重复调度多次触发
- **THEN** 系统仅更新当日记录，不新增重复记录

### Requirement: 每日 Cron 先更新股价再记录净值

系统 SHALL 在每日 Cron 中对每个用户先执行股价更新，再记录当日净值。净值快照 MUST 基于该次 Cron 中已完成的最新持仓价格状态。

#### Scenario: 先价后值执行顺序

- **WHEN** 每日 Cron 开始处理某用户
- **THEN** 系统先执行该用户股价更新流程，随后执行净值记录流程

#### Scenario: 股价更新后净值被刷新

- **WHEN** 某用户在 Cron 中至少一条持仓价格更新成功
- **THEN** 系统记录的当日净值反映更新后的持仓价格

### Requirement: 每日 Cron 采用宽松模式记录净值

系统 SHALL 采用宽松模式：即使该用户股价更新出现部分失败或全部失败，也 MUST 继续写入当日净值，并返回该用户报价同步状态（`ok` / `partial` / `failed`）与统计结果。

#### Scenario: 部分报价失败仍写净值

- **WHEN** 某用户股价更新结果为部分成功（同时存在 updated 与 failed）
- **THEN** 系统仍写入当日净值，并标记 `quoteSyncStatus=partial`

#### Scenario: 报价全部失败仍写净值

- **WHEN** 某用户股价更新结果为全部失败（无 updated）
- **THEN** 系统仍写入当日净值，并标记 `quoteSyncStatus=failed`

### Requirement: 净值历史页使用 LoadingSpinner 加载动画

净值历史页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."，且列表与图表允许分别进入独立的 loading/error 状态。

#### Scenario: 净值页加载中

- **WHEN** 净值历史页首次进入且列表与图表数据都尚未可用
- **THEN** 页面显示 `LoadingSpinner` 组件，替代原有纯文本

#### Scenario: 图表请求失败但列表仍可展示

- **WHEN** 图表接口请求失败但历史列表请求成功
- **THEN** 页面保留历史列表内容，并仅在图表区域展示错误态与重试入口
