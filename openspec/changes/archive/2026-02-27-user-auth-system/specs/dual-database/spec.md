## MODIFIED Requirements

### Requirement: 双方言 Schema 定义

系统 SHALL 维护两套 Drizzle schema 定义文件：`src/db/schema-sqlite.ts`（使用 `sqliteTable`）和 `src/db/schema-pg.ts`（使用 `pgTable`），两套 schema 的表名、字段名、关系保持一致。`src/db/schema.ts` SHALL 根据 `DB_TYPE` 重导出对应方言的 schema。两套 schema MUST 同步包含 auth 相关表（users, auth_accounts, sessions, verification_tokens）和业务表的 userId 字段。

#### Scenario: SQLite schema 导出

- **WHEN** `DB_TYPE=sqlite`
- **THEN** `import * from "@/db/schema"` 导出 SQLite 方言的表定义，包含 auth 表和业务表的 userId 字段

#### Scenario: PostgreSQL schema 导出

- **WHEN** `DB_TYPE=postgres`
- **THEN** `import * from "@/db/schema"` 导出 PostgreSQL 方言的表定义，包含 auth 表和业务表的 userId 字段

#### Scenario: 两套 schema 表结构一致

- **WHEN** 比较两套 schema 的表名和字段
- **THEN** 所有表名、列名、关系完全一致（包括 auth 表和 userId 字段），仅类型映射不同

#### Scenario: Auth 表命名映射

- **WHEN** 查看 auth 相关表定义
- **THEN** Auth.js 标准的 accounts 表命名为 auth_accounts，避免与业务 accounts 表冲突

### Requirement: Seed 兼容双数据库

`src/db/seed.ts` SHALL 兼容 SQLite 和 PostgreSQL 两种数据库。全局 seed 仅插入共享数据（exchangeRates）。用户级数据（assetClasses, settings）SHALL 在用户注册时单独初始化，不在全局 seed 中执行。

#### Scenario: 全局 seed 只含共享数据

- **WHEN** 应用启动时执行 seed
- **THEN** seed 函数仅插入 exchangeRates 等全局共享数据，不插入 assetClasses 和 settings

#### Scenario: seed 幂等性

- **WHEN** 多次运行 seed 函数
- **THEN** 不会产生重复数据，已存在的记录不被覆盖
