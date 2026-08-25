## Why

当前只能用独立入金、出金模拟账户间调拨，既容易重复或漏记，也会把内部资金移动错误计为投资组合外部现金流。需要提供一次完成、可追溯且可整体回滚的账户互转能力。

## What Changes

- 在 Dashboard“交易”入口和通用交易弹窗中新增“账户互转”选项。
- 支持选择转出账户、转入账户、转出金额和实际到账金额；同币种自动保持金额一致，跨币种允许按实际兑换结果录入到账金额。
- 一次互转原子更新两个账户的现金余额与原始资金，并生成一对关联的转出/转入交易记录。
- 删除互转记录时整体回滚两个账户及关联记录，禁止产生单边状态。
- 账户互转视为投资组合内部现金流，不纳入 TWR 的入金/出金外部现金流。
- 为 SQLite 与 PostgreSQL 的交易表增加互转关联字段，并纳入自动迁移。

## Capabilities

### New Capabilities

- `account-transfer`: 账户互转的输入、校验、原子记账、记录关联和整体回滚行为。

### Modified Capabilities

- `transaction-management`: 增加互转交易类型、表单入口、列表展示和成组删除约束。
- `account-principal-ledger`: 原始资金随内部互转在来源与目标账户之间同步迁移。
- `dashboard`: Dashboard 通用“交易”入口可选择账户互转。
- `dual-database`: SQLite 与 PostgreSQL 同步保存互转关联字段并执行迁移。

## Impact

- API：新增 `/api/transfers` 创建接口，扩展交易查询与删除行为。
- 数据模型：`transactions` 新增互转组标识和对手账户字段，扩展交易类型。
- UI：扩展通用交易弹窗与交易记录筛选/列表。
- 计算：账户现金与 principal 同步变化；TWR 继续只识别 deposit/withdraw，互转不作为外部现金流。
- 缓存与净值：复用交易写操作的缓存失效和当日净值刷新链路。
