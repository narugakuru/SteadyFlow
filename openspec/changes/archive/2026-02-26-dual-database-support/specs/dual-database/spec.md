## ADDED Requirements

### Requirement: 数据库类型配置切换
系统 SHALL 支持通过环境变量 `DB_TYPE` 切换数据库类型，可选值为 `sqlite`（默认）和 `postgres`。当 `DB_TYPE=postgres` 时，系统 SHALL 使用 `DATABASE_URL` 环境变量连接 PostgreSQL（Neon）；当 `DB_TYPE=sqlite` 时，系统 SHALL 使用本地 `data/invest.db` 文件。

#### Scenario: 默认使用 SQLite
- **WHEN** 未设置 `DB_TYPE` 环境变量
- **THEN** 系统使用 SQLite 数据库，数据存储在 `data/invest.db`

#### Scenario: 配置使用 PostgreSQL
- **WHEN** 设置 `DB_TYPE=postgres` 且 `DATABASE_URL` 指向有效的 Neon 连接串
- **THEN** 系统使用 PostgreSQL 数据库，通过 Neon HTTP driver 连接

#### Scenario: PostgreSQL 缺少连接串
- **WHEN** 设置 `DB_TYPE=postgres` 但未设置 `DATABASE_URL`
- **THEN** 系统启动时抛出明确错误提示："DB_TYPE=postgres requires DATABASE_URL to be set"

### Requirement: 双方言 Schema 定义
系统 SHALL 维护两套 Drizzle schema 定义文件：`src/db/schema-sqlite.ts`（使用 `sqliteTable`）和 `src/db/schema-pg.ts`（使用 `pgTable`），两套 schema 的表名、字段名、关系保持一致。`src/db/schema.ts` SHALL 根据 `DB_TYPE` 重导出对应方言的 schema。

#### Scenario: SQLite schema 导出
- **WHEN** `DB_TYPE=sqlite`
- **THEN** `import * from "@/db/schema"` 导出 SQLite 方言的表定义

#### Scenario: PostgreSQL schema 导出
- **WHEN** `DB_TYPE=postgres`
- **THEN** `import * from "@/db/schema"` 导出 PostgreSQL 方言的表定义

#### Scenario: 两套 schema 表结构一致
- **WHEN** 比较两套 schema 的表名和字段
- **THEN** 所有表名、列名、关系完全一致，仅类型映射不同（如 SQLite integer → PG serial，SQLite real → PG doublePrecision）

### Requirement: 统一数据库连接入口
系统 SHALL 通过 `src/db/index.ts` 统一导出 `db` 实例，API 路由层使用 `import { db } from "@/db"` 的方式不变。连接逻辑根据 `DB_TYPE` 选择对应驱动。

#### Scenario: SQLite 连接
- **WHEN** `DB_TYPE=sqlite`
- **THEN** 使用 `better-sqlite3` 驱动创建连接，启用 WAL 模式和外键约束

#### Scenario: PostgreSQL 连接
- **WHEN** `DB_TYPE=postgres`
- **THEN** 使用 `@neondatabase/serverless` 的 neon HTTP driver 创建连接

#### Scenario: API 路由无需改动
- **WHEN** 切换数据库类型
- **THEN** 所有 `src/app/api/` 下的路由代码无需修改，`db.select()`, `db.insert()` 等调用方式保持不变

### Requirement: 迁移文件分目录管理
系统 SHALL 将 SQLite 迁移文件存放在 `drizzle/` 目录，PostgreSQL 迁移文件存放在 `drizzle-pg/` 目录。`drizzle.config.ts` SHALL 根据 `DB_TYPE` 环境变量输出对应方言的配置。

#### Scenario: 生成 SQLite 迁移
- **WHEN** 运行 `npx drizzle-kit generate`（DB_TYPE=sqlite 或默认）
- **THEN** 迁移文件生成到 `drizzle/` 目录，使用 SQLite DDL 语法

#### Scenario: 生成 PostgreSQL 迁移
- **WHEN** 设置 `DB_TYPE=postgres` 后运行 `npx drizzle-kit generate`
- **THEN** 迁移文件生成到 `drizzle-pg/` 目录，使用 PostgreSQL DDL 语法

#### Scenario: 自动迁移
- **WHEN** 应用启动时
- **THEN** 系统根据当前 `DB_TYPE` 从对应目录加载并执行迁移

### Requirement: Seed 兼容双数据库
`src/db/seed.ts` SHALL 兼容 SQLite 和 PostgreSQL 两种数据库，seed 函数 SHALL 为异步函数（async），使用 Drizzle 的通用 query API 确保两种驱动下行为一致。

#### Scenario: SQLite seed
- **WHEN** `DB_TYPE=sqlite`，首次启动应用
- **THEN** seed 函数正确插入默认资产类别和系统设置

#### Scenario: PostgreSQL seed
- **WHEN** `DB_TYPE=postgres`，首次启动应用
- **THEN** seed 函数正确插入默认资产类别和系统设置，与 SQLite seed 结果一致

#### Scenario: seed 幂等性
- **WHEN** 多次运行 seed 函数
- **THEN** 不会产生重复数据，已存在的记录不被覆盖

### Requirement: PostgreSQL 类型映射
PostgreSQL schema SHALL 使用以下类型映射保持与 SQLite schema 的数据兼容性：

| SQLite 类型 | PostgreSQL 类型 |
|-------------|----------------|
| `integer().primaryKey({ autoIncrement: true })` | `serial().primaryKey()` |
| `text()` | `text()` |
| `real()` | `doublePrecision()` |
| `integer()` (用作 boolean) | `boolean()` |
| `text().default(sql\`datetime('now')\`)` | `text().default(sql\`now()\`)` |

#### Scenario: 布尔字段映射
- **WHEN** SQLite 中 `affectCash` 和 `affectHolding` 使用 `integer` 存储 0/1
- **THEN** PostgreSQL 中使用 `boolean` 类型存储 true/false，API 返回值在两种数据库下行为一致

#### Scenario: 时间戳字段映射
- **WHEN** SQLite 中 `created_at` 存储为 text 格式的 ISO 时间字符串
- **THEN** PostgreSQL 中同样使用 `text` 类型存储，保持 API 返回格式一致
