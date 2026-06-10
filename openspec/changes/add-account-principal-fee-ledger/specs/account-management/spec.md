## MODIFIED Requirements

### Requirement: 创建账户

系统 SHALL 允许已登录用户创建资金账户，包含以下字段：账户名称（必填）、币种（必填，枚举值：CNY/USD/HKD）、初始现金 cashBalance（必填，数值类型，原始币种）、原始资金 principal（必填，数值类型，原始币种）。创建时 MUST 自动绑定当前用户 ID。若客户端未显式传入 principal，系统 SHALL 以初始现金 cashBalance 作为默认 principal。

#### Scenario: 成功创建 CNY 账户

- **WHEN** 已登录用户填写账户名称为"A股券商"，币种为 CNY，初始现金为 200000，原始资金为 200000
- **THEN** 系统创建该账户，cashBalance=200000，principal=200000，userId=当前用户ID

#### Scenario: 创建账户默认原始资金

- **WHEN** 已登录用户创建账户时只传入 cashBalance=50000 且未传入 principal
- **THEN** 系统创建账户并将 principal 初始化为 50000

#### Scenario: 未登录创建账户

- **WHEN** 未登录用户请求 POST /api/accounts
- **THEN** 系统返回 401 Unauthorized

### Requirement: 编辑账户

系统 SHALL 允许用户编辑已有账户的名称、币种、现金余额（cashBalance）和原始资金（principal）。principal MUST 使用账户原始币种存储，且编辑账户时手动设置 principal 不会自动创建交易记录。

#### Scenario: 更新账户现金余额

- **WHEN** 用户将"A股券商"账户现金余额从 50000 修改为 60000
- **THEN** 系统更新 cashBalance=60000，账户总价值自动重算为 60000 + 持仓市值之和

#### Scenario: 更新账户原始资金

- **WHEN** 用户将"A股券商"账户原始资金从 100000 修改为 120000
- **THEN** 系统更新 principal=120000，账户累计盈亏按新的 principal 重新计算

### Requirement: 账户展开详情提供编辑账户入口

账户管理页 SHALL 在账户展开详情的操作区提供“编辑账户”入口，并将其放在“新建持仓”入口之后。点击“编辑账户” MUST 打开现有账户编辑弹窗，允许用户编辑账户名称、币种、现金余额和原始资金。账户展开详情摘要行 MUST 依次展示总价值、持仓、现金、累计盈亏。累计盈亏 MUST 显示金额和比例；金额按 `accountValue - principal` 计算，比例仅当 `principal > 0` 时显示，否则显示 `--`。账户主列表行 MUST 保持极简展示，不恢复行级编辑按钮、表头或排序控件，且现有持仓盈亏金额和比例显示 MUST 保留。

#### Scenario: 展开账户后显示编辑入口

- **WHEN** 用户点击账户行展开账户详情
- **THEN** 账户详情操作区显示“新建持仓”和其后的“编辑账户”入口

#### Scenario: 点击编辑账户打开账户编辑弹窗

- **WHEN** 用户在账户展开详情中点击“编辑账户”
- **THEN** 系统打开该账户的编辑弹窗，表单字段为账户名称、币种、现金余额和原始资金

#### Scenario: 展开摘要显示累计盈亏

- **WHEN** 用户展开一个账户详情
- **THEN** 摘要行在总价值、持仓、现金之后显示累计盈亏金额和比例

#### Scenario: 持仓盈亏显示保留

- **WHEN** 用户查看账户主列表行
- **THEN** 账户主列表仍显示现有持仓盈亏金额和比例，不替换为累计盈亏

#### Scenario: 主账户行不恢复编辑按钮

- **WHEN** 用户查看账户列表主行
- **THEN** 主行不显示行级编辑账户按钮，账户列表仍保持无表头极简展示
