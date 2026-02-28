## Purpose

定义 daily-netvalue 能力的业务约束与验收标准。

## Requirements

### Requirement: 自动创建每日净值

系统 SHALL 在已登录用户每天首次打开应用时自动创建当日资产净值记录。如果当天该用户已有净值记录则不重复创建。净值 MUST 绑定当前用户 ID。netvalue 表的唯一约束为 (userId, date) 联合唯一。

#### Scenario: 当天首次打开应用

- **WHEN** 用户今天第一次打开应用，数据库中无该用户今日净值记录
- **THEN** 系统自动创建今日净值记录，记录当前用户的资产状态，userId=当前用户ID

#### Scenario: 当天再次打开应用

- **WHEN** 用户今天再次打开应用，数据库中已有该用户今日净值记录
- **THEN** 系统不创建新记录，使用已有数据

#### Scenario: 不同用户同日净值独立

- **WHEN** 用户 A 和用户 B 在同一天各自打开应用
- **THEN** 系统分别为两个用户创建独立的净值记录

### Requirement: 净值数据内容

净值页中的数值 SHALL 使用统一格式化函数：

- 总资产金额：使用 `formatAmount()` 格式化
- 各类别金额：使用 `formatAmount()` 格式化

#### Scenario: 净值总资产显示

- **WHEN** 净值记录总资产为 500000
- **THEN** 显示为 `¥500,000`

#### Scenario: 净值总资产有小数

- **WHEN** 净值记录总资产为 500000.5
- **THEN** 显示为 `¥500,000.5`

### Requirement: 手动触发净值更新

系统 SHALL 允许用户手动触发更新当日净值，用于在更新持仓数据后刷新当天的净值记录。

#### Scenario: 更新持仓后刷新净值

- **WHEN** 用户更新了持仓数据后点击"刷新净值"按钮
- **THEN** 系统用当前最新数据覆盖今日净值记录

### Requirement: 净值历史页使用 LoadingSpinner 加载动画

净值历史页 SHALL 在数据加载期间使用 `LoadingSpinner` 组件替代纯文本"加载中..."。

#### Scenario: 净值页加载中

- **WHEN** 净值历史页通过 useFetch 获取净值数据
- **THEN** 页面显示 LoadingSpinner 组件，替代原有纯文本
