## 1. 依赖安装与项目配置

- [x] 1.1 安装 auth 相关依赖：next-auth@beta (Auth.js v5), @auth/drizzle-adapter, bcrypt, @types/bcrypt
- [x] 1.2 新增环境变量：AUTH_SECRET, GITHUB_ID, GITHUB_SECRET（更新 .env.example）
- [x] 1.3 创建 GitHub OAuth 配置说明文档 docs/github-oauth-setup.md

## 2. Auth 数据库 Schema

- [x] 2.1 schema-pg.ts 新增 auth 表：users（含 password/role/plan 扩展字段）、authAccounts、sessions、verificationTokens
- [x] 2.2 schema-sqlite.ts 同步新增 auth 表，保持与 PG schema 结构一致
- [x] 2.3 schema-pg.ts 业务表新增 userId 字段：accounts、assetClasses、snapshots、settings（先 nullable）
- [x] 2.4 schema-sqlite.ts 同步业务表新增 userId 字段
- [x] 2.5 schema.ts 统一导出入口新增 auth 表导出
- [x] 2.6 snapshots 表 date 唯一约束改为 (userId, date) 联合唯一；settings 表 key 唯一约束改为 (userId, key) 联合唯一
- [x] 2.7 生成 Drizzle 迁移文件（SQLite + PostgreSQL 双方言）

## 3. Auth.js 配置

- [x] 3.1 创建 src/lib/auth.ts：配置 Auth.js v5，Drizzle Adapter（自定义表名映射 accounts → authAccounts）
- [x] 3.2 配置 Credentials Provider：邮箱密码登录，bcrypt.compare 验证
- [x] 3.3 配置 GitHub Provider：OAuth 登录
- [x] 3.4 配置 JWT callbacks：jwt() 写入 userId/role/plan，session() 暴露给客户端；默认过期 24h，"记住我"模式 30 天
- [x] 3.5 配置自定义页面路径：signIn → /login
- [x] 3.6 创建 src/app/api/auth/[...nextauth]/route.ts 路由

## 4. 注册与登录页面

- [x] 4.1 创建 /register 页面：邮箱 + 密码表单，密码最少 6 位校验，邮箱唯一性检查
- [x] 4.2 创建注册 API src/app/api/register/route.ts：bcrypt 哈希密码，创建 users 记录，首个用户自动 admin，触发用户级 seed
- [x] 4.3 创建 /login 页面：邮箱密码表单 + "记住我"复选框 + GitHub OAuth 按钮 + 注册链接
- [x] 4.4 登录/注册页面样式：居中卡片布局，与项目整体风格一致

## 5. 路由守卫

- [x] 5.1 创建 middleware.ts：公开路由（/login, /register, /api/auth/*）放行，保护路由检查 JWT，管理路由检查 role=admin
- [x] 5.2 未登录访问保护路由重定向到 /login
- [x] 5.3 已登录访问 /login 或 /register 重定向到 /
- [x] 5.4 非 admin 访问 /admin/* 重定向到 /

## 6. 数据迁移

- [ ] 6.1 创建迁移脚本：插入默认 admin 用户（使用环境变量或硬编码邮箱密码）
- [ ] 6.2 迁移脚本：将现有 accounts、assetClasses、snapshots、settings 的 userId 设为默认用户 ID
- [ ] 6.3 userId 字段改为 NOT NULL，生成并执行迁移

## 7. Seed 改造

- [ ] 7.1 全局 seed.ts 改造：仅保留 exchangeRates 等共享数据，移除 assetClasses 和 settings 的 seed
- [ ] 7.2 创建用户级 seed 函数 src/lib/user-seed.ts：为新用户创建默认 assetClasses 和 settings
- [ ] 7.3 注册流程中调用用户级 seed

## 8. API 层改造 — 直接关联表

- [ ] 8.1 创建 auth 辅助函数 src/lib/auth-utils.ts：封装 session 获取 + 401 响应
- [ ] 8.2 /api/accounts GET/POST：加 session 检查，查询加 userId 过滤，创建时写入 userId
- [ ] 8.3 /api/accounts/[id] GET/PUT/DELETE：加 session 检查，操作前验证账户属于当前用户
- [ ] 8.4 /api/asset-classes GET/POST/PUT/DELETE：加 session 检查 + userId 过滤
- [ ] 8.5 /api/snapshots GET/POST：加 session 检查 + userId 过滤
- [ ] 8.6 /api/settings GET/POST：加 session 检查 + userId 过滤

## 9. API 层改造 — 间接关联表

- [ ] 9.1 /api/holdings GET/POST：加 session 检查，通过 JOIN accounts 验证用户归属
- [ ] 9.2 /api/holdings/[id] GET/PUT/DELETE：加 session 检查，通过 JOIN accounts 验证用户归属
- [ ] 9.3 /api/transactions GET/POST：加 session 检查，通过 JOIN accounts 验证用户归属
- [ ] 9.4 /api/transactions/[id] GET/DELETE：加 session 检查，通过 JOIN accounts 验证用户归属
- [ ] 9.5 /api/asset-allocation GET：加 session 检查，计算范围限定为当前用户数据
- [ ] 9.6 /api/batch-update POST：加 session 检查，验证所有持仓属于当前用户

## 10. 前端 Session 适配

- [ ] 10.1 layout.tsx 包裹 SessionProvider
- [ ] 10.2 navbar.tsx 改造：右侧显示用户名/头像 + 登出按钮，admin 显示"管理"导航项
- [ ] 10.3 各页面数据请求无需改动（API 层已按用户过滤），验证页面正常工作

## 11. 管理后台

- [ ] 11.1 创建 /api/admin/users GET：返回所有用户列表（不含 password），admin 权限检查
- [ ] 11.2 创建 /api/admin/users/[id] PUT：修改用户 role/plan，admin 权限检查，禁止修改自己角色
- [ ] 11.3 创建 /api/admin/stats GET：返回用户统计数据（总数、今日新增、角色分布、计划分布）
- [ ] 11.4 创建 /admin/page.tsx：管理面板入口，显示统计卡片
- [ ] 11.5 创建 /admin/users/page.tsx：用户列表表格，支持修改角色和计划

## 12. 测试与验证

- [ ] 12.1 验证注册流程：邮箱密码注册 → 自动登录 → 默认数据初始化
- [ ] 12.2 验证登录流程：邮箱密码登录 + GitHub OAuth 登录
- [ ] 12.3 验证数据隔离：不同用户数据互不可见
- [ ] 12.4 验证路由守卫：未登录重定向、admin 路由保护
- [ ] 12.5 验证双数据库：SQLite 和 PostgreSQL 模式下 auth 功能一致
- [ ] 12.6 验证现有数据迁移：迁移后数据归属正确，功能正常
