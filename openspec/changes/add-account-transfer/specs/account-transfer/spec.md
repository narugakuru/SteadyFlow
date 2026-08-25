## ADDED Requirements

### Requirement: 创建账户互转

系统 SHALL 允许已登录用户在自己名下两个不同账户之间创建互转。请求 MUST 包含转出账户、转入账户、转出金额、到账金额和日期；两个金额 MUST 为正数。系统 MUST 验证两个账户均属于当前用户且不是同一账户。同币种互转 MUST 强制到账金额等于转出金额；跨币种互转 SHALL 使用用户填写的实际到账金额。

#### Scenario: 同币种账户互转

- **WHEN** 用户从 CNY 账户 A 向 CNY 账户 B 转出 10000
- **THEN** 系统将到账金额固定为 10000，并创建互转

#### Scenario: 跨币种账户互转

- **WHEN** 用户从 CNY 账户转出 7200，并为 USD 账户填写实际到账 1000
- **THEN** 系统分别以 7200 CNY 和 1000 USD 记录两侧金额

#### Scenario: 拒绝无效互转

- **WHEN** 来源与目标相同、任一金额非正数或任一账户不属于当前用户
- **THEN** 系统拒绝请求且不修改任何账户或交易记录

### Requirement: 互转原子记账

系统 MUST 在一个数据库事务或原子批处理中减少来源账户的 `cashBalance` 与 `principal`、增加目标账户的 `cashBalance` 与 `principal`，并创建共享 `transferGroupId` 的 `transfer_out` 和 `transfer_in` 两条交易记录。两条记录 MUST 保存对手账户标识及各自账户本币下的 `cashDelta`、`principalDelta`。互转 MUST NOT 改变任一账户的 `realizedPnl`。

#### Scenario: 互转更新现金和原始资金

- **WHEN** 来源账户转出 5000 且目标账户实际到账 700
- **THEN** 来源账户现金与 principal 各减少 5000，目标账户现金与 principal 各增加 700

#### Scenario: 互转写入部分失败

- **WHEN** 两个账户更新或两条交易插入中的任一步骤失败
- **THEN** 系统整体回滚，不留下单边账户变化或单条互转记录

### Requirement: 整组删除互转

系统 SHALL 允许用户从任一侧互转记录发起删除。系统 MUST 根据 `transferGroupId` 在同一事务或原子批处理中反向应用两侧 delta 并删除整组记录；任一步骤失败时 MUST 保持删除前状态。

#### Scenario: 从转出记录删除互转

- **WHEN** 用户删除一笔 `transfer_out` 记录
- **THEN** 系统回滚来源和目标账户的现金及 principal，并同时删除关联的 `transfer_in` 记录

#### Scenario: 从转入记录删除互转

- **WHEN** 用户删除一笔 `transfer_in` 记录
- **THEN** 系统执行与从转出侧删除相同的整组回滚

### Requirement: 互转是内部现金流

账户互转 SHALL 被视为投资组合内部资金移动。`transfer_out` 与 `transfer_in` MUST NOT 作为 TWR 的外部现金流来源。

#### Scenario: 互转不影响 TWR 现金流剔除

- **WHEN** 收益率服务计算包含账户互转日期的区间
- **THEN** 服务不把互转两侧金额计入 deposit/withdraw 外部现金流
