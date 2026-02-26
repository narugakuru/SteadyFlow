## MODIFIED Requirements

### Requirement: 总资产概览
系统 SHALL 在 Dashboard 顶部显示当前用户的总资产金额（CNY），总资产 = Σ 当前用户各账户总额按汇率换算为 CNY。

#### Scenario: 多币种总资产汇总
- **WHEN** 当前用户有 CNY 账户总额 200000、USD 账户总额 10000（汇率 7.2）
- **THEN** Dashboard 显示总资产 ¥272,000

### Requirement: Dashboard 布局
系统 SHALL 调整 Dashboard 布局为：总资产卡片 + 饼状图 + 配置纪律表（含可展开的类别详情）+ 再平衡建议。所有数据 MUST 限定为当前用户的数据。

#### Scenario: Dashboard 默认展示
- **WHEN** 已登录用户打开 Dashboard（/）
- **THEN** 页面从上到下依次显示：当前用户的总资产卡片、饼状图（按大类）、纪律表（含偏离度柱状图）、再平衡建议。不显示账户列表。不显示其他用户的数据
