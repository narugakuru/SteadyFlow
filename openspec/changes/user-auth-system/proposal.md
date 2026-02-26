## Why

项目准备上线 Vercel 对外提供服务，当前所有 API 和页面完全公开，无任何身份认证和数据隔离。需要新增用户注册、登录、权限管理功能，确保每个用户只能访问自己的数据。同时为未来的收费计划预留扩展点。本地 SQLite 和云端 PostgreSQL 使用统一的 auth 逻辑，避免维护两套代码。

## What Changes

- 新增 Auth.js v5 (NextAuth) 集成，支持邮箱密码登录 (bcrypt) 和 GitHub OAuth 登录
- 新增 auth 相关数据库表：users, authAccounts, sessions, verificationTokens（双 schema 同步）
- 用户表设计 role ("admin" | "user") 和 plan ("free" | "pro") 两个正交维度
- Session 策略采用 JWT（适合 Vercel serverless 环境）
- 新增登录页 `/login` 和注册页 `/register`
- 新增 `middleware.ts` 全局路由守卫（公开路由 vs 保护路由 vs 管理路由）
- **BREAKING**：业务表 accounts, assetClasses, snapshots, settings 新增 userId 字段，所有业务数据绑定到用户
- **BREAKING**：所有业务 API 注入 userId 过滤，未登录请求返回 401
- 新增数据迁移脚本：现有无主数据归属到默认用户
- 前端导航栏适配：显示用户信息、登出按钮
- 新增管理后台 `/admin`：用户列表、角色管理、基础统计
- 新增 GitHub OAuth 申请步骤说明文档

## Capabilities

### New Capabilities
- `user-auth`: 用户认证系统，包括注册、登录（邮箱密码 + GitHub OAuth）、JWT session 管理、Auth.js 配置
- `user-data-isolation`: 用户数据隔离，业务表加 userId、API 层统一过滤、数据迁移
- `admin-panel`: 管理后台，admin 路由守卫、用户管理页面、基础统计面板

### Modified Capabilities
- `account-management`: accounts 表新增 userId 字段，创建/查询/编辑/删除操作需绑定当前用户
- `holding-management`: holdings 通过 account 间接关联用户，查询需 join 过滤
- `transaction-management`: transactions 通过 account 间接关联用户，查询需 join 过滤
- `asset-allocation`: 资产配置计算范围限定为当前用户的数据
- `daily-snapshot`: snapshots 表新增 userId 字段，快照数据按用户隔离
- `batch-update`: 批量更新限定为当前用户的持仓
- `dashboard`: 总览页数据限定为当前用户
- `navigation-layout`: 导航栏新增用户信息显示和登出按钮
- `dual-database`: auth 表需要同步维护 SQLite 和 PostgreSQL 两套 schema

## Impact

- 依赖新增：next-auth (Auth.js v5), @auth/drizzle-adapter, bcrypt, @types/bcrypt
- 数据库 schema 变更：新增 4 张 auth 表 + 4 张业务表加 userId 列
- 所有 API 路由需改造：注入 session 检查和 userId 过滤
- 新增 middleware.ts 影响所有路由的访问控制
- 环境变量新增：AUTH_SECRET, GITHUB_ID, GITHUB_SECRET
- 前端组件改造：navbar 显示用户状态，页面需处理未登录重定向
- 需要数据迁移：现有数据归属默认用户
