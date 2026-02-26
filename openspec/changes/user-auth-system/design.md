## Context

InvestManage 是一个个人投资组合管理工具，当前所有 API 和页面完全公开，无身份认证。项目使用 Next.js 16 App Router + Drizzle ORM，支持 SQLite/PostgreSQL 双数据库（通过 DB_TYPE 环境变量切换）。现准备上线 Vercel 对外开放注册使用，需要完整的用户认证和数据隔离体系。

现有业务表：accounts, holdings, transactions, assetClasses, exchangeRates, snapshots, settings。其中 accounts 表名与 Auth.js 标准 schema 的 accounts 表冲突。

## Goals / Non-Goals

**Goals:**
- 实现完整的用户注册、登录、登出流程（邮箱密码 + GitHub OAuth）
- 所有业务数据按用户隔离，每个用户只能访问自己的数据
- 本地 SQLite 和云端 PostgreSQL 使用完全一致的 auth 逻辑
- 支持 admin 角色和未来收费计划扩展
- 管理后台：用户列表、角色管理、基础统计

**Non-Goals:**
- 邮箱验证（后续迭代）
- 密码重置/找回（后续迭代）
- 收费计划的具体实现（仅预留 plan 字段）
- 细粒度权限控制（RBAC）
- 数据共享/协作功能

## Decisions

### 1. Auth 框架：Auth.js v5 (NextAuth)

**选择理由：**
- Next.js App Router 原生支持最好
- Credentials Provider + GitHub Provider 开箱即用
- Drizzle Adapter 官方维护
- Vercel 部署零配置
- 社区最大，文档最全

**替代方案：**
- Lucia Auth：更轻量但已宣布停止维护（2025），不适合新项目
- 自建 auth：工作量大，安全风险高，无必要

### 2. Session 策略：JWT

**选择理由：**
- Vercel serverless 环境无持久连接，JWT 无需查库验证
- 减少数据库查询开销
- 适合 API 路由的无状态验证

**替代方案：**
- Database Session：可即时撤销但每次请求需查库，serverless 环境下延迟较高

**JWT 过期策略：**
- 默认过期时间：24 小时
- "记住我"模式：30 天（登录时勾选）
- Auth.js 配置 `session.maxAge` 动态设置

**JWT Payload 扩展字段：**
```
{
  sub: userId,
  role: "admin" | "user",
  plan: "free" | "pro",
  name: string,
  email: string
}
```

### 3. Auth 表命名：自定义表名映射（Auth.js Drizzle Adapter 配置）

**选择理由：**
- Auth.js 标准 schema 的 `accounts` 表与业务 `accounts` 表冲突
- 通过 Drizzle Adapter 的 schema 映射，将 Auth 的 accounts 表命名为 `auth_accounts`
- 业务表完全不动，零改动风险

**具体映射：**
| Auth.js 标准名 | 实际表名 |
|----------------|----------|
| users | users |
| accounts | auth_accounts |
| sessions | sessions |
| verification_tokens | verification_tokens |

**users 表扩展字段：**
- `password`: text, nullable（OAuth 用户无密码）
- `role`: text, default "user"（"admin" | "user"）
- `plan`: text, default "free"（"free" | "pro"）

### 4. 密码哈希：bcrypt

**选择理由：**
- Vercel serverless 环境兼容性好
- 生态成熟，npm 包稳定
- 安全性满足需求

**替代方案：**
- argon2：更现代安全但 serverless 环境兼容性不如 bcrypt

### 5. 数据隔离策略：业务表加 userId + API 层统一过滤

**需要加 userId 的表：**
- `accounts`: 直接加 userId 字段
- `assetClasses`: 直接加 userId 字段（用户自定义分类）
- `snapshots`: 直接加 userId 字段
- `settings`: 直接加 userId 字段

**通过外键间接隔离的表（不加 userId）：**
- `holdings`: 通过 accountId → accounts.userId 间接关联
- `transactions`: 通过 accountId → accounts.userId 间接关联

**全局共享的表（不加 userId）：**
- `exchangeRates`: 汇率数据所有用户共享

**API 层改造模式：**
```typescript
// 每个业务 API 的标准模式
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  // 查询加 userId 过滤
  const rows = await db.select().from(accounts).where(eq(accounts.userId, userId));
}
```

**间接关联表的查询模式：**
```typescript
// holdings 通过 join accounts 过滤
const rows = await db.select()
  .from(holdings)
  .innerJoin(accounts, eq(holdings.accountId, accounts.id))
  .where(eq(accounts.userId, userId));
```

### 6. 路由守卫：Next.js Middleware + Auth.js

**路由分类：**
```
公开路由（无需登录）:
  /login, /register, /api/auth/*

保护路由（需要登录）:
  /, /accounts, /transactions, /snapshots, /batch-update, /market
  /api/accounts, /api/holdings, /api/transactions, ...

管理路由（需要 admin 角色）:
  /admin, /admin/*
  /api/admin/*
```

**实现方式：**
- `middleware.ts`: 检查 JWT token，未登录重定向到 /login
- 管理路由在 middleware 层检查 token 中的 role 字段
- API 路由在 handler 内通过 `auth()` 获取 session

### 7. 注册流程

**首个用户自动成为 admin：**
- 注册时检查 users 表是否为空
- 如果为空，新用户 role 设为 "admin"
- 否则 role 设为 "user"

**流程设计：**
1. 用户访问 /register
2. 填写邮箱 + 密码（密码最少 6 位）
3. 提交后 bcrypt 哈希密码，创建 users 记录（首个用户自动 admin）
4. 自动登录，跳转到首页
5. 系统为新用户自动执行 seed（默认资产类别等）

**GitHub OAuth 流程：**
1. 用户点击 "GitHub 登录" 按钮
2. 跳转 GitHub 授权页
3. 授权后回调，Auth.js 自动创建/关联用户
4. OAuth 用户 password 字段为 null

### 8. Seed 策略调整

**现状：** seed.ts 在 db/index.ts 中全局执行一次，插入默认资产类别和设置。
**改造：** seed 逻辑需要改为按用户执行。新用户注册后，为其创建默认的 assetClasses 和 settings。全局 seed 仅保留 exchangeRates 等共享数据。

### 9. 前端 Session 适配

**Navbar 改造：**
- 已登录：显示用户名/头像 + 登出按钮
- admin 用户：额外显示"管理"导航项
- 未登录：不应出现（middleware 已重定向）

**SessionProvider：**
- 在 layout.tsx 中包裹 `<SessionProvider>`
- 组件通过 `useSession()` 获取用户信息

## Risks / Trade-offs

- [JWT 无法即时撤销] → token 过期时间设为 24h，后续可加 token 黑名单
- [Auth 表命名冲突] → 通过 Drizzle Adapter 自定义表名映射解决，已验证可行
- [现有数据迁移] → 创建默认用户归属现有数据，userId 先 nullable 再改 NOT NULL
- [双 schema 维护成本增加] → auth 表也需要同步维护 SQLite/PG 两套，但结构简单，风险可控
- [bcrypt 在 Edge Runtime 不可用] → middleware 只检查 JWT token 不调用 bcrypt，bcrypt 仅在 Node.js API 路由中使用
- [Credentials Provider 安全性] → Auth.js 官方不推荐 Credentials，但我们的场景（邮箱密码登录）必须用，通过 bcrypt + HTTPS 保障安全

## Migration Plan

**Step 1: Schema 变更**
1. 双 schema 新增 auth 表（users, auth_accounts, sessions, verification_tokens）
2. 双 schema 业务表加 userId 列（nullable）
3. 生成并执行 Drizzle 迁移

**Step 2: Auth 基础设施**
4. 安装依赖：next-auth, @auth/drizzle-adapter, bcrypt
5. 配置 Auth.js（providers, callbacks, adapter）
6. 创建 /login 和 /register 页面
7. 添加 middleware.ts 路由守卫

**Step 3: 数据迁移**
8. 创建迁移脚本：插入默认 admin 用户
9. 将现有无主数据的 userId 设为默认用户
10. userId 列改为 NOT NULL

**Step 4: API 改造**
11. 所有业务 API 加 session 检查 + userId 过滤
12. seed.ts 改为按用户执行

**Step 5: 前端适配**
13. layout.tsx 加 SessionProvider
14. navbar 显示用户信息 + 登出
15. 管理后台页面

**Rollback:**
- Schema 变更通过 Drizzle 迁移可回滚
- Auth 相关代码在独立文件中，可快速移除
- middleware.ts 删除即恢复无 auth 状态

## Open Questions

（已全部解决）

- ~~首个注册用户是否自动成为 admin？~~ → 是，注册时检查 users 表为空则自动设为 admin
- ~~token 过期时间设多长合适？~~ → 默认 24h
- ~~是否需要"记住我"功能？~~ → 需要，勾选后 session 有效期延长至 30 天
