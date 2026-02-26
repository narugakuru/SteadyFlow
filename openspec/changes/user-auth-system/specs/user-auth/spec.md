## ADDED Requirements

### Requirement: 用户注册
系统 SHALL 提供 /register 页面，允许新用户通过邮箱和密码注册。密码 MUST 至少 6 位。注册成功后自动登录并跳转到首页。系统 SHALL 使用 bcrypt 对密码进行哈希存储。注册时 MUST 检查邮箱唯一性。首个注册用户 MUST 自动成为 admin（role="admin"）。

#### Scenario: 成功注册
- **WHEN** 用户在注册页填写邮箱 "test@example.com" 和密码 "123456" 并提交
- **THEN** 系统创建用户记录（password 为 bcrypt 哈希，role="user"，plan="free"），自动登录并跳转到首页

#### Scenario: 首个用户自动成为 admin
- **WHEN** 系统中尚无任何用户，第一个用户注册
- **THEN** 系统创建用户记录，role 自动设为 "admin"

#### Scenario: 邮箱已存在
- **WHEN** 用户注册时填写的邮箱已被其他用户使用
- **THEN** 系统显示错误提示"该邮箱已被注册"，不创建用户

#### Scenario: 密码过短
- **WHEN** 用户注册时填写的密码少于 6 位
- **THEN** 系统显示错误提示"密码至少 6 位"，不创建用户

#### Scenario: 新用户默认数据初始化
- **WHEN** 新用户注册成功
- **THEN** 系统为该用户创建默认的资产类别（assetClasses）和系统设置（settings）

### Requirement: 邮箱密码登录
系统 SHALL 提供 /login 页面，支持邮箱和密码登录，并提供"记住我"复选框。登录成功后跳转到首页或之前尝试访问的页面。使用 Auth.js Credentials Provider 实现。

#### Scenario: 成功登录
- **WHEN** 用户在登录页填写正确的邮箱和密码
- **THEN** 系统验证 bcrypt 哈希匹配，创建 JWT session，跳转到首页

#### Scenario: 勾选记住我登录
- **WHEN** 用户填写正确的邮箱和密码，并勾选"记住我"
- **THEN** 系统创建有效期 30 天的 JWT session

#### Scenario: 不勾选记住我登录
- **WHEN** 用户填写正确的邮箱和密码，未勾选"记住我"
- **THEN** 系统创建有效期 24 小时的 JWT session

#### Scenario: 密码错误
- **WHEN** 用户填写正确的邮箱但错误的密码
- **THEN** 系统显示错误提示"邮箱或密码错误"，不创建 session

#### Scenario: 邮箱不存在
- **WHEN** 用户填写未注册的邮箱
- **THEN** 系统显示错误提示"邮箱或密码错误"（不泄露邮箱是否存在）

#### Scenario: 登录页提供注册链接
- **WHEN** 用户访问 /login 页面
- **THEN** 页面底部显示"没有账号？立即注册"链接，指向 /register

### Requirement: GitHub OAuth 登录
系统 SHALL 在登录页提供 GitHub OAuth 登录按钮。使用 Auth.js GitHub Provider 实现。OAuth 用户首次登录时自动创建用户记录。

#### Scenario: GitHub 首次登录
- **WHEN** 用户点击 "GitHub 登录" 按钮并在 GitHub 授权页完成授权
- **THEN** 系统自动创建用户记录（password=null，使用 GitHub 头像和用户名），创建 auth_accounts 关联记录，登录并跳转首页

#### Scenario: GitHub 再次登录
- **WHEN** 已通过 GitHub 注册的用户再次点击 "GitHub 登录"
- **THEN** 系统通过 auth_accounts 关联找到已有用户，直接登录

#### Scenario: GitHub 邮箱与已有账户冲突
- **WHEN** GitHub 账户的邮箱与已通过邮箱密码注册的用户相同
- **THEN** 系统将 GitHub OAuth 关联到已有用户账户，不创建新用户

### Requirement: JWT Session 管理
系统 SHALL 使用 JWT 策略管理用户 session。JWT payload MUST 包含 userId、role、plan、name、email 字段。默认过期时间为 24 小时。勾选"记住我"时过期时间延长至 30 天。

#### Scenario: JWT 包含扩展字段
- **WHEN** 用户登录成功
- **THEN** 生成的 JWT token 包含 sub(userId)、role、plan、name、email 字段

#### Scenario: 默认 Session 过期
- **WHEN** 用户登录时未勾选"记住我"
- **THEN** JWT token 有效期为 24 小时，过期后需重新登录

#### Scenario: 记住我延长 Session
- **WHEN** 用户登录时勾选"记住我"
- **THEN** JWT token 有效期延长至 30 天

#### Scenario: Session 过期
- **WHEN** JWT token 超过有效期
- **THEN** 系统将用户重定向到 /login 页面

#### Scenario: 服务端获取 Session
- **WHEN** API 路由调用 `auth()` 函数
- **THEN** 返回包含 userId、role、plan 的 session 对象，或未登录时返回 null

### Requirement: 用户登出
系统 SHALL 支持用户登出功能，清除 JWT session。

#### Scenario: 成功登出
- **WHEN** 用户点击导航栏的登出按钮
- **THEN** 系统清除 session，重定向到 /login 页面

### Requirement: 路由守卫
系统 SHALL 通过 Next.js middleware 实现全局路由守卫，区分公开路由、保护路由和管理路由。

#### Scenario: 未登录访问保护路由
- **WHEN** 未登录用户访问 / 或 /accounts 等保护路由
- **THEN** 系统重定向到 /login

#### Scenario: 未登录访问公开路由
- **WHEN** 未登录用户访问 /login 或 /register
- **THEN** 系统正常显示页面，不重定向

#### Scenario: 已登录访问登录页
- **WHEN** 已登录用户访问 /login 或 /register
- **THEN** 系统重定向到首页 /

#### Scenario: 非 admin 访问管理路由
- **WHEN** role="user" 的用户访问 /admin 或 /admin/*
- **THEN** 系统返回 403 或重定向到首页

#### Scenario: admin 访问管理路由
- **WHEN** role="admin" 的用户访问 /admin
- **THEN** 系统正常显示管理页面

#### Scenario: API 路由未登录
- **WHEN** 未携带有效 JWT 的请求访问 /api/accounts 等业务 API
- **THEN** 系统返回 401 Unauthorized

### Requirement: Auth 数据库表
系统 SHALL 在 SQLite 和 PostgreSQL 双 schema 中同步维护 auth 相关表。Auth.js 标准的 accounts 表 MUST 命名为 auth_accounts 以避免与业务 accounts 表冲突。

#### Scenario: users 表结构
- **WHEN** 查看 users 表定义
- **THEN** 包含字段：id, name, email(unique), emailVerified, image, password(nullable), role(default "user"), plan(default "free"), createdAt

#### Scenario: auth_accounts 表结构
- **WHEN** 查看 auth_accounts 表定义
- **THEN** 包含 Auth.js 标准 accounts 表的所有字段（userId, type, provider, providerAccountId 等），表名为 auth_accounts

#### Scenario: 双 schema 同步
- **WHEN** 比较 SQLite 和 PostgreSQL 的 auth 表定义
- **THEN** 表名、字段名、关系完全一致，仅类型映射不同

### Requirement: GitHub OAuth 配置说明
系统 SHALL 提供 GitHub OAuth 应用申请和配置的步骤说明文档。

#### Scenario: 文档内容完整
- **WHEN** 开发者查看 GitHub OAuth 配置文档
- **THEN** 文档包含：GitHub Developer Settings 入口、创建 OAuth App 步骤、Authorization callback URL 配置（本地和 Vercel）、获取 Client ID 和 Client Secret、环境变量配置说明（GITHUB_ID, GITHUB_SECRET）
