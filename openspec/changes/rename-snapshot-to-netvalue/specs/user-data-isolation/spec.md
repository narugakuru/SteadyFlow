## MODIFIED Requirements

### Requirement: 业务表 userId 字段

系统 SHALL 在以下业务表中包含 userId 字段，关联到 users 表：accounts, assetClasses, netvalue, settings。holdings 和 transactions 通过 accountId 外键间接关联用户，不新增 userId。exchangeRates 保持全局共享，不加 userId。

#### Scenario: netvalue 表 userId

- **WHEN** 查看 netvalue 表定义
- **THEN** 包含 userId 字段（NOT NULL，外键关联 users.id），date 的唯一约束为 (userId, date) 联合唯一

#### Scenario: accounts 表 userId

- **WHEN** 查看 accounts 表定义
- **THEN** 包含 userId 字段（NOT NULL，外键关联 users.id）

#### Scenario: assetClasses 表 userId

- **WHEN** 查看 assetClasses 表定义
- **THEN** 包含 userId 字段（NOT NULL，外键关联 users.id）

#### Scenario: settings 表 userId

- **WHEN** 查看 settings 表定义
- **THEN** 包含 userId 字段（NOT NULL，外键关联 users.id），key 的唯一约束改为 (userId, key) 联合唯一

#### Scenario: exchangeRates 保持全局

- **WHEN** 查看 exchangeRates 表定义
- **THEN** 不包含 userId 字段，汇率数据所有用户共享
