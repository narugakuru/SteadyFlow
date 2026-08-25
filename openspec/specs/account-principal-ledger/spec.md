## Purpose

定义 account-principal-ledger 能力的业务约束与验收标准，覆盖账户原始资金、累计盈亏、费用扣除和交易删除副作用回滚。

## Requirements

### Requirement: 账户原始资金存储

系统 SHALL 在账户原币种下存储账户原始资金 `principal`。`principal` SHALL 可通过账户创建/编辑手动设置，并只通过入金和出金交易自动变更。

#### Scenario: 新账户原始资金

- **WHEN** 用户创建账户并设置 `principal=100000`
- **THEN** 系统以账户原币种存储 `principal=100000`

### Requirement: 原始资金现金流更新

系统 SHALL 在入金交易创建时增加账户 `principal`，在出金交易创建时减少账户 `principal`。买入、卖出、股息和费用扣除交易 MUST NOT 直接改变 `principal`。

#### Scenario: 入金增加原始资金

- **WHEN** 用户创建金额为 `20000` 的入金交易
- **THEN** 目标账户 `principal` 增加 `20000`

#### Scenario: 出金减少原始资金

- **WHEN** 用户创建金额为 `8000` 的出金交易
- **THEN** 目标账户 `principal` 减少 `8000`

### Requirement: 累计盈亏计算

系统 SHALL 将账户累计盈亏金额计算为 `accountValue - principal`，其中 `accountValue = cashBalance + holdingsValue`。累计盈亏比例 SHALL 仅在 `principal > 0` 时按 `cumulativePnl / principal` 计算；当 `principal <= 0` 时，比例 MUST 显示为 `--`。

#### Scenario: 正本金累计盈亏比例

- **WHEN** 账户总价值为 `120000` 且 `principal=100000`
- **THEN** 累计盈亏金额为 `20000`，累计盈亏比例为 `20%`

#### Scenario: 非正本金累计盈亏比例

- **WHEN** 账户总价值为 `30000` 且 `principal=0`
- **THEN** 累计盈亏金额仍显示为 `30000`，累计盈亏比例显示为 `--`

### Requirement: 费用扣除交易副作用

系统 SHALL 支持独立费用扣除交易 `type=fee`。费用扣除交易 MUST 减少账户现金，MUST 以负数计入 `realizedPnl`，MUST NOT 关联或改变持仓，且 MUST NOT 改变 `principal`。

#### Scenario: 费用扣除减少现金和了结盈亏

- **WHEN** 用户创建金额为 `50` 的费用扣除交易
- **THEN** 账户现金减少 `50`，账户累计 `realizedPnl` 减少 `50`，账户 `principal` 保持不变

### Requirement: 交易副作用 delta

系统 SHALL 为新交易存储现金、本金、持仓和了结盈亏相关 delta，以支持删除交易时精确反向回滚。shares 模式持仓的成本 delta MUST 表示总成本基准变化，而不是平均成本变化。

#### Scenario: 入金 delta

- **WHEN** 用户创建金额为 `1000` 的入金交易
- **THEN** 交易记录存储 `cashDelta=1000` 和 `principalDelta=1000`

#### Scenario: 费用 delta

- **WHEN** 用户创建金额为 `25` 的费用扣除交易
- **THEN** 交易记录存储 `cashDelta=-25`、`principalDelta=0`、`realizedPnl=-25`

### Requirement: 删除交易反向回滚

系统 SHALL 在删除交易时基于该交易记录存储的 delta 反向回滚现金、本金、持仓和账户累计了结盈亏，并在同一事务或原子批处理中删除交易记录。若回滚会导致持仓份额、成本或市值为非法负数，系统 MUST 拒绝删除并保持数据不变。

#### Scenario: 删除入金回滚现金和本金

- **WHEN** 用户删除一笔 `cashDelta=1000` 且 `principalDelta=1000` 的入金交易
- **THEN** 账户现金和 `principal` 各减少 `1000`，交易记录被删除

#### Scenario: 删除费用回滚现金和了结盈亏

- **WHEN** 用户删除一笔 `cashDelta=-50` 且 `realizedPnl=-50` 的费用扣除交易
- **THEN** 账户现金增加 `50`，账户累计 `realizedPnl` 增加 `50`，交易记录被删除

#### Scenario: 非法回滚被拒绝

- **WHEN** 删除交易会导致持仓份额、成本或市值变为负数
- **THEN** 系统拒绝删除并保持账户、持仓和交易记录不变

### Requirement: 账户互转迁移原始资金

系统 SHALL 在账户互转时按各账户本币金额迁移 `principal`：来源账户减少转出金额，目标账户增加实际到账金额。互转删除时 MUST 依据关联交易的 `principalDelta` 整组反向回滚。互转 MUST NOT 被解释为组合层面的新增或撤回本金。

#### Scenario: 同币种互转本金守恒

- **WHEN** 用户在两个 CNY 账户间互转 10000
- **THEN** 来源 principal 减少 10000，目标 principal 增加 10000

#### Scenario: 跨币种按本币迁移本金

- **WHEN** 用户从 CNY 账户转出 7200 并向 USD 账户实际转入 1000
- **THEN** 来源 principal 减少 7200 CNY，目标 principal 增加 1000 USD
