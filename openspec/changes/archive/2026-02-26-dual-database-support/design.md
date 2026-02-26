## Context

当前项目使用 SQLite（better-sqlite3）+ Drizzle ORM，数据库文件存储在 `data/invest.db`。所有数据库操作通过 `src/db/index.ts` 导出的 `db` 实例进行，API 路由中使用 Drizzle 的 query builder（`db.select()`, `db.insert()` 等）。

现需部署到 Vercel，Vercel 无法持久化本地文件，需要迁移到云端 PostgreSQL（Neon）。同时保留 SQLite 支持本地/离线部署场景。

关键约束：
- Drizzle ORM 的 SQLite 和 PostgreSQL 方言使用不同的 schema 定义函数（`sqliteTable` vs `pgTable`）
- SQLite 驱动（better-sqlite3）是同步的，Neon HTTP 驱动是异步的
- 现有 API 路由中大量使用 `.all()`, `.get()`, `.run()` 等同步方法

## Goals / Non-Goals

**Goals:**
- 通过环境变量 `DB_TYPE=sqlite|postgres` 切换数据库
- PostgreSQL 使用 Neon serverless driver，适配 Vercel 边缘/serverless 环境
- 两套 schema 保持表结构和字段完全一致
- 迁移文件分目录管理（`drizzle/` for SQLite, `drizzle-pg/` for PostgreSQL）
- seed 逻辑兼容两种数据库
- 对 API 路由层的改动最小化

**Non-Goals:**
- 不做 SQLite → PostgreSQL 的数据迁移工具（用户手动或后续实现）
- 不做运行时动态切换数据库（启动时确定，运行期间不变）
- 不改变现有业务逻辑和 API 接口
- 不引入 ORM 抽象层（直接利用 Drizzle 的双方言能力）

## Decisions

### 1. Schema 双文件策略

**选择**：`src/db/schema-sqlite.ts` + `src/db/schema-pg.ts`，`src/db/schema.ts` 作为统一导出入口根据 `DB_TYPE` 重导出。

**理由**：Drizzle 的 `sqliteTable` 和 `pgTable` 返回类型不同，无法用一套代码同时满足两种方言的类型系统。拆分为两个文件，每个文件使用对应方言的 API，保持类型安全。

**替代方案**：
- 用 `drizzle-orm` 的通用 schema API → 不存在，Drizzle 没有方言无关的 schema 定义
- 用代码生成从一份定义生成两套 → 过度工程，7 张表手动维护成本低

### 2. 数据库连接动态选择

**选择**：`src/db/index.ts` 根据 `process.env.DB_TYPE` 选择驱动，统一导出 `db` 实例。

```
if DB_TYPE === 'postgres':
  使用 @neondatabase/serverless + drizzle-orm/neon-http
  连接 DATABASE_URL
else:
  使用 better-sqlite3 + drizzle-orm/better-sqlite3（现有逻辑）
```

**理由**：保持 `import { db } from "@/db"` 的使用方式不变，API 路由零改动。

### 3. Neon 驱动选择

**选择**：`@neondatabase/serverless` + `drizzle-orm/neon-http`（HTTP 模式）

**理由**：
- Vercel serverless 函数冷启动频繁，HTTP 模式无需维护连接池，每次请求独立
- Neon 官方推荐 serverless 场景使用 HTTP driver
- 替代方案 `postgres` (node-postgres) 需要连接池管理，在 serverless 环境下容易连接泄漏

### 4. 迁移文件管理

**选择**：
- SQLite 迁移：`drizzle/`（保持现有）
- PostgreSQL 迁移：`drizzle-pg/`
- `drizzle.config.ts` 根据环境变量输出不同配置

**理由**：两种数据库的 DDL 语法不同，迁移文件必须分开。drizzle-kit 的 `generate` 和 `migrate` 命令通过配置文件区分。

### 5. 同步/异步兼容

**选择**：Drizzle 的 query builder 在两种驱动下都返回 Promise（better-sqlite3 驱动也支持 await），API 路由统一使用 `await`。

**理由**：Drizzle ORM 的 better-sqlite3 驱动虽然底层是同步的，但 `db.select().from().all()` 等方法返回的结果可以直接 await（同步值 await 后仍是原值）。但需要注意：
- `.get()` → 改用 `.then(rows => rows[0])` 或 Drizzle 的 `.limit(1)`
- `.run()` → Drizzle 的 `.execute()` 在两种驱动下行为一致
- seed 函数需改为 async

### 6. PostgreSQL 类型映射

SQLite → PostgreSQL 的字段类型映射：
| SQLite | PostgreSQL | 说明 |
|--------|-----------|------|
| `integer().primaryKey({ autoIncrement: true })` | `serial().primaryKey()` | 自增主键 |
| `text()` | `text()` / `varchar()` | 字符串 |
| `real()` | `doublePrecision()` / `real()` | 浮点数 |
| `integer()` (boolean) | `boolean()` | affectCash/affectHolding |
| `text().default(sql\`datetime('now')\`)` | `timestamp().defaultNow()` | 时间戳 |

## Risks / Trade-offs

- **Schema 同步风险**：两套 schema 文件需手动保持一致 → 在 specs 中明确字段映射规则，后续可加 lint 检查
- **类型差异**：SQLite 用 integer 表示 boolean，PostgreSQL 用原生 boolean → API 层需确保返回值一致（Drizzle 会自动处理）
- **时间戳格式差异**：SQLite 存 text（ISO string），PostgreSQL 存 timestamp → API 返回格式可能不同，需在 schema 层统一为 text 或在序列化时处理
- **Seed 幂等性**：PostgreSQL 的 `serial` 主键在重复 seed 时可能冲突 → seed 使用 `ON CONFLICT DO NOTHING` 或先检查再插入（现有逻辑已是先检查）
- **本地开发体验**：开发者需要明确设置 `DB_TYPE`，默认值为 `sqlite` 保持向后兼容
