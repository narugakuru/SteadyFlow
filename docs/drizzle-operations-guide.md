# Drizzle 开发与部署操作手册

> 适用于 InvestManage 当前双数据库架构（SQLite + PostgreSQL）。

## 1. 项目当前约定

- 数据库类型通过 `DB_TYPE` 控制：
  - `sqlite`（默认，本地开发）
  - `postgres`（Neon PostgreSQL，测试/生产）
- 配置文件：
  - SQLite: `drizzle.config.ts`
  - PostgreSQL: `drizzle.config.pg.ts`
- 迁移目录：
  - SQLite: `drizzle/`
  - PostgreSQL: `drizzle-pg/`
- 运行时行为（`src/db/index.ts`）：
  - 应用启动会自动执行对应目录的 migrate
  - PostgreSQL 启动时会自动创建 `drizzle.__drizzle_migrations`
  - PostgreSQL 检测到“业务表空但迁移记录存在”会自动清空迁移记录并重跑
  - migrate 之后会执行 seed（当前仅汇率）

## 2. 常用命令速查

## SQLite

```bash
# 生成迁移（SQLite）
npx drizzle-kit generate --config=drizzle.config.ts --name=<change_name>

# 手动执行迁移（通常不需要，启动会自动跑）
npx drizzle-kit migrate --config=drizzle.config.ts

# 校验迁移元数据
npx drizzle-kit check --config=drizzle.config.ts
```

## PostgreSQL

```bash
# 生成迁移（package.json 已提供脚本）
npm run db:generate:pg

# 手动执行迁移
npm run db:migrate:pg

# 校验迁移元数据
npx drizzle-kit check --config=drizzle.config.pg.ts
```

## 3. 场景化操作流程

### 场景 A：本地 SQLite 日常开发

1. `.env` 使用 `DB_TYPE=sqlite`。
2. 修改 schema（建议 SQLite/PG 两套同时改，避免长期漂移）。
3. 生成 SQLite 迁移：
   - `npx drizzle-kit generate --config=drizzle.config.ts --name=<change_name>`
4. 启动应用：
   - `npm run dev`
5. 启动时自动 migrate + seed，无需额外手工执行。
6. 提交前执行：
   - `npx drizzle-kit check --config=drizzle.config.ts`

### 场景 B：本地或测试环境联调 PostgreSQL

1. 设置环境变量：
   - `DB_TYPE=postgres`
   - `DATABASE_URL=<neon_url>`
2. 修改 `src/db/schema-pg.ts`（与 SQLite 结构保持一致）。
3. 生成 PG 迁移：
   - `npm run db:generate:pg`
4. 手动迁移（可选）：
   - `npm run db:migrate:pg`
5. 启动应用：
   - `npm run dev`（启动仍会做自动迁移兜底）
6. 提交前执行：
   - `npx drizzle-kit check --config=drizzle.config.pg.ts`

### 场景 C：生产部署（Vercel + Neon）

1. Vercel 环境变量至少包含：
   - `DB_TYPE=postgres`
   - `DATABASE_URL`
   - 认证相关变量（`AUTH_SECRET` 等）
2. 推荐先在 CI 或部署前手动执行一次：
   - `npm run db:migrate:pg`
3. 线上启动时自动迁移仅作为兜底，不建议长期依赖“首次请求触发迁移”。
4. 破坏性迁移（重命名/删列/类型变更）前先备份数据库。

### 场景 D：新增一个 schema 变更（推荐标准流程）

1. 同步修改：
   - `src/db/schema-sqlite.ts`
   - `src/db/schema-pg.ts`
2. 生成 SQLite 迁移并检查 SQL。
3. 生成 PG 迁移并检查 SQL。
4. 本地分别用 SQLite / PG 启动验证。
5. 检查 `drizzle*/meta/_journal.json` 与 `*_snapshot.json` 是否一致。
6. 提交迁移 SQL + meta 文件，不要只提 SQL 不提 meta。

## 4. meta/snapshot/journal 是什么

- `meta/_journal.json`：迁移索引（idx、tag、时间等）
- `meta/000x_snapshot.json`：对应迁移后的 schema 快照
- `000x_*.sql`：真正执行的 SQL

运行迁移时主要依赖 `sql + _journal`；  
`snapshot` 主要用于 `drizzle-kit generate/check/push` 计算差异。

如果 `_journal` 和 `snapshot` 不一致，应用可能仍能跑，但后续生成迁移容易重复或异常。

## 5. 常见报错与排查

| 报错/现象                                                  | 高概率原因                                          | 处理方式                                                        |
| ---------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `DB_TYPE=postgres requires DATABASE_URL to be set`         | 开了 PG 模式但没配 `DATABASE_URL`                   | 补齐环境变量，重启服务                                          |
| `Can't find meta/_journal.json file`                       | 迁移目录损坏或没初始化                              | 检查 `drizzle/` 或 `drizzle-pg/` 是否完整；必要时重新生成迁移链 |
| `No file ... found in ... folder`                          | `_journal.json` 有记录但对应 `.sql` 缺失            | 恢复缺失 SQL（从 git 历史取回）或修正 journal                   |
| `...snapshot...collision` / `...not of the latest version` | meta 快照链冲突或版本过旧                           | 先执行 `npx drizzle-kit up`（若提示），再修复快照链并 `check`   |
| PG 启动后表不存在                                          | `DB_TYPE`/`DATABASE_URL` 指错环境，或迁移未执行成功 | 看启动日志，手动跑 `npm run db:migrate:pg`，确认连接的是目标库  |
| SQLite `database is locked`                                | 多进程同时写、外部工具占用 DB 文件                  | 关闭占用进程，避免多个 dev 实例同时连接同一个 `data/invest.db`  |
| `FOREIGN KEY constraint failed`                            | 关联数据不存在或 userId 隔离导致引用无效            | 先查 parent 记录是否存在，再看 API 是否使用了当前用户数据       |
| 新迁移重复生成旧改动                                       | meta 快照缺失/链断裂                                | 用 `npx drizzle-kit check` 找问题，补齐缺失 snapshot 后再生成   |

## 6. PG 快照链不一致修复（实战步骤）

适用场景：`drizzle-pg/meta/_journal.json` 里有 `idx=0001`，但缺 `meta/0001_snapshot.json`。

1. 先备份当前 `drizzle-pg/`。
2. 在临时目录生成一份 PG 快照：
   - `npx drizzle-kit generate --schema=./src/db/schema-pg.ts --out=.tmp-drizzle-pg-meta --dialect=postgresql --name=meta_fix_temp --prefix=index`
3. 复制临时的 `meta/0000_snapshot.json` 到正式目录命名为 `drizzle-pg/meta/0001_snapshot.json`。
4. 将新文件的 `prevId` 改成 `drizzle-pg/meta/0000_snapshot.json` 的 `id`。
5. 校验：
   - `npx drizzle-kit check --config=drizzle.config.pg.ts`
6. 删除临时目录 `.tmp-drizzle-pg-meta`。

## 7. 发布前检查清单

- `npx drizzle-kit check --config=drizzle.config.ts`
- `npx drizzle-kit check --config=drizzle.config.pg.ts`
- SQLite 与 PG 都能本地启动并自动 migrate
- 新增迁移是否同时覆盖 `drizzle/` 与 `drizzle-pg/`
- 破坏性变更是否有备份和回滚方案
