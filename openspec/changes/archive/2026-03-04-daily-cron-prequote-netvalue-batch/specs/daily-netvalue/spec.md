## MODIFIED Requirements

### Requirement: 自动创建每日净值

系统 SHALL 支持在无用户登录操作的情况下由每日任务自动创建或刷新当日净值。净值记录 MUST 绑定用户 ID，并以 `(userId, date)` 为唯一键幂等写入（同日覆盖更新，不重复新增）。

#### Scenario: 用户不登录也会记录当日净值

- **WHEN** 用户当天没有登录或进行任何手动操作，但每日 Cron 成功执行
- **THEN** 系统仍为该用户写入或刷新该业务日期的净值记录

#### Scenario: 同日重复触发幂等

- **WHEN** 同一用户在同一业务日期内多次触发净值记录
- **THEN** 系统仅更新该用户当日净值记录，不新增第二条

#### Scenario: 不同用户同日净值独立

- **WHEN** 用户 A 和用户 B 在同一业务日期分别触发净值记录
- **THEN** 系统分别维护各自的净值记录，互不影响

## ADDED Requirements

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
