## 1. 依赖安装与配置

- [x] 1.1 安装 `@neondatabase/serverless` 依赖
- [x] 1.2 更新 `.env` 文件，添加 `DB_TYPE=sqlite` 和 `DATABASE_URL` 变量（含注释说明）
- [x] 1.3 更新 `.env.example`（如有）同步环境变量模板

## 2. Schema 双方言拆分

- [x] 2.1 将现有 `src/db/schema.ts` 重命名为 `src/db/schema-sqlite.ts`（内容不变）
- [x] 2.2 创建 `src/db/schema-pg.ts`，使用 `pgTable` 重写所有 7 张表，字段名和关系保持一致，类型按映射规则转换（serial/doublePrecision/boolean/text）
- [x] 2.3 创建新的 `src/db/schema.ts` 作为统一导出入口，根据 `DB_TYPE` 重导出对应方言的 schema

## 3. 数据库连接重构

- [x] 3.1 重构 `src/db/index.ts`，根据 `DB_TYPE` 选择驱动：sqlite 用 better-sqlite3，postgres 用 @neondatabase/serverless neon HTTP driver
- [x] 3.2 PostgreSQL 模式下从 `DATABASE_URL` 读取连接串，缺失时抛出明确错误
- [x] 3.3 SQLite 模式保持现有逻辑（WAL、外键、本地文件）
- [x] 3.4 迁移逻辑适配：SQLite 从 `drizzle/` 加载，PostgreSQL 从 `drizzle-pg/` 加载

## 4. Seed 适配

- [x] 4.1 重构 `src/db/seed.ts` 为 async 函数，使用 Drizzle 通用 query API（await db.select/insert）兼容两种驱动
- [x] 4.2 更新 `src/db/index.ts` 中 seed 调用方式，适配 async seed

## 5. Drizzle Config 双方言

- [x] 5.1 重构 `drizzle.config.ts`，根据 `DB_TYPE` 输出 sqlite 或 postgresql 配置（不同 schema 文件、不同输出目录、不同 dialect）
- [x] 5.2 运行 `npx drizzle-kit generate`（DB_TYPE=postgres）生成 PostgreSQL 初始迁移到 `drizzle-pg/`

## 6. 验证与测试

- [x] 6.1 SQLite 模式验证：确认现有功能不受影响，应用正常启动、seed 正常、CRUD 正常
- [x] 6.2 PostgreSQL 模式验证：配置 Neon 连接串，确认迁移执行、seed 正常、基本 CRUD 正常
- [x] 6.3 检查 API 路由层无需改动（db.select/insert/update/delete 在两种驱动下行为一致）
