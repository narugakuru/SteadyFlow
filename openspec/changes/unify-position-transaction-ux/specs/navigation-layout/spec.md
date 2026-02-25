## ADDED Requirements

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
