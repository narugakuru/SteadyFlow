## ADDED Requirements

### Requirement: 双数据库保存互转关联

SQLite 与 PostgreSQL 的 `transactions` 表 SHALL 同步提供可空的 `transferGroupId` 与 `counterpartyAccountId` 字段，并支持 `transfer_out`、`transfer_in` 类型。迁移 MUST 兼容历史记录且在 Vercel 构建期自动执行 PostgreSQL 迁移。

#### Scenario: 历史交易迁移兼容

- **WHEN** 现有数据库执行互转字段迁移
- **THEN** 历史交易保留不变且新增关联字段为 null

#### Scenario: 两种数据库创建互转

- **WHEN** 应用分别在 SQLite 和 PostgreSQL 模式创建账户互转
- **THEN** 两种模式均原子保存两条具有关联组和对手账户的交易记录
