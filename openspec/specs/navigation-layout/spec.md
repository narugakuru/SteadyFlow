## Requirements

### Requirement: 全局顶部导航栏
系统 SHALL 在所有页面顶部显示统一的导航栏，包含以下导航项：总览(/)、账户(/accounts)、交易(/transactions)、快照(/snapshots)、股价更新(/batch-update)。

#### Scenario: 导航栏展示
- **WHEN** 用户打开任意页面
- **THEN** 页面顶部显示导航栏，包含所有导航项，当前页面对应的导航项高亮

#### Scenario: 导航跳转
- **WHEN** 用户点击导航栏中的"交易"
- **THEN** 页面跳转到 /transactions

### Requirement: 配置入口
系统 SHALL 在导航栏中提供配置入口（⚙️图标），点击后弹出配置弹窗，不跳转页面。

#### Scenario: 打开配置弹窗
- **WHEN** 用户点击导航栏中的⚙️图标
- **THEN** 弹出资产类别配置弹窗，不发生页面跳转

### Requirement: 导航栏响应式
系统 SHALL 确保导航栏在不同屏幕宽度下正常显示。

#### Scenario: 正常宽度显示
- **WHEN** 屏幕宽度足够
- **THEN** 导航栏水平排列所有导航项

### Requirement: 持仓与交易交叉导航
系统 SHALL 在账户详情页的持仓列表和交易记录页之间提供交叉导航链接，方便用户在相关上下文间快速跳转。

#### Scenario: 从持仓跳转到交易记录
- **WHEN** 用户在账户详情页点击某持仓的"交易记录"链接
- **THEN** 页面跳转到 /transactions 并自动按该持仓所属账户筛选

#### Scenario: 从交易记录跳转到持仓所在账户
- **WHEN** 用户在交易记录页点击某条交易的持仓名称
- **THEN** 页面跳转到 /accounts 并自动展开该持仓所属的账户详情

### Requirement: 账户页 URL 参数支持
系统 SHALL 支持通过 URL 参数 accountId 自动选中并展开对应账户的详情页。

#### Scenario: 通过 URL 参数打开账户详情
- **WHEN** 用户访问 /accounts?accountId=3
- **THEN** 账户页自动选中 id=3 的账户并展示其持仓详情
