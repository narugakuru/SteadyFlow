## MODIFIED Requirements

### Requirement: PostgreSQL 类型映射

PostgreSQL schema SHALL 使用以下类型映射保持与 SQLite schema 的数据兼容性：

| SQLite 类型                                     | PostgreSQL 类型              |
| ----------------------------------------------- | ---------------------------- |
| `integer().primaryKey({ autoIncrement: true })` | `serial().primaryKey()`      |
| `text()`                                        | `text()`                     |
| `real()`                                        | `doublePrecision()`          |
| `integer()` (用作 boolean)                      | `integer()` (存储 0/1)       |
| `text().default(sql`datetime('now')`)`          | `text().default(sql`now()`)` |

#### Scenario: 布尔字段映射

- **WHEN** SQLite 中 `affectCash` 和 `affectHolding` 使用 `integer` 存储 0/1
- **THEN** PostgreSQL 中同样使用 `integer` 存储 0/1，API 返回值在两种数据库下行为一致

#### Scenario: 时间戳字段映射

- **WHEN** SQLite 中 `created_at` 存储为 text 格式的 ISO 时间字符串
- **THEN** PostgreSQL 中同样使用 `text` 类型存储，保持 API 返回格式一致
