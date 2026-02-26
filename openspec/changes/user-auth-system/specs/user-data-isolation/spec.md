## ADDED Requirements

### Requirement: 业务表 userId 字段
系统 SHALL 在以下业务表中新增 userId 字段，关联到 users 表：accounts, assetClasses, snapshots, settings。holdings 和 transactions 通过 accountId 外键间接关联用户，不新增 userId。exchangeRates 保持全局共享，不加 userId。

#### Scenario: accounts 表 userId
- **WHEN** 查看 accounts 表定义
- **THEN** 包含 userId 字段（NOT NULL，外键关联 users.id）

#### Scenario: assetClasses 表 userId
- **WHEN** 查看 assetClasses 表定义
- **THEN** 包含 userId 字段（NOT NULL，外键关联 users.id）

#### Scenario: snapshots 表 userId
- **WHEN** 查看 snapshots 表定义
- **THEN** 包含 userId 字段（NOT NULL，外键关联 users.id），date 的唯一约束改为 (userId, date) 联合唯一

#### Scenario: settings 表 userId
- **WHEN** 查看 settings 表定义
- **THEN** 包含 userId 字段（NOT NULL，外键关联 users.id），key 的唯一约束改为 (userId, key) 联合唯一

#### Scenario: exchangeRates 保持全局
- **WHEN** 查看 exchangeRates 表定义
- **THEN** 不包含 userId 字段，汇率数据所有用户共享

### Requirement: API 层用户数据过滤
系统 SHALL 在所有业务 API 中通过 session 获取当前用户 ID，查询时注入 userId 过滤条件。未登录请求 MUST 返回 401。

#### Scenario: 直接关联表查询过滤
- **WHEN** 已登录用户请求 GET /api/accounts
- **THEN** 系统只返回该用户的账户数据（WHERE userId = currentUserId）

#### Scenario: 间接关联表查询过滤
- **WHEN** 已登录用户请求 GET /api/holdings
- **THEN** 系统通过 JOIN accounts 只返回该用户账户下的持仓数据

#### Scenario: 创建数据自动绑定用户
- **WHEN** 已登录用户通过 POST /api/accounts 创建账户
- **THEN** 系统自动将当前用户 ID 写入 accounts.userId

#### Scenario: 跨用户数据不可访问
- **WHEN** 用户 A 尝试通过 API 访问用户 B 的账户（如 DELETE /api/accounts/5，但 id=5 属于用户 B）
- **THEN** 系统返回 404（不泄露数据存在性）

### Requirement: 现有数据迁移
系统 SHALL 提供数据迁移方案，将现有无 userId 的业务数据归属到默认用户。

#### Scenario: 迁移脚本执行
- **WHEN** 执行数据迁移
- **THEN** 系统创建一个默认 admin 用户，将所有现有 accounts、assetClasses、snapshots、settings 的 userId 设为该用户 ID

#### Scenario: 迁移后 userId 非空
- **WHEN** 迁移完成
- **THEN** 所有业务表的 userId 字段改为 NOT NULL 约束

### Requirement: 用户级 Seed 数据
系统 SHALL 在新用户注册时为其创建默认数据。全局 seed 仅保留共享数据（exchangeRates）。

#### Scenario: 新用户默认资产类别
- **WHEN** 新用户注册成功
- **THEN** 系统为该用户创建默认的 assetClasses 记录（如股票基金、债券、黄金、现金等）

#### Scenario: 新用户默认设置
- **WHEN** 新用户注册成功
- **THEN** 系统为该用户创建默认的 settings 记录（如偏离阈值等）

#### Scenario: 全局 seed 只含共享数据
- **WHEN** 应用启动时执行全局 seed
- **THEN** 仅插入 exchangeRates 等全局共享数据，不插入用户级数据
