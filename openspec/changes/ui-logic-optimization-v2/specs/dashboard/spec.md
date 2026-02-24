## MODIFIED Requirements

### Requirement: Dashboard 布局
系统 SHALL 调整 Dashboard 布局为：总资产卡片 + 饼状图 + 配置纪律表（含可展开的类别详情）+ 账户视角。移除独立的"资产类别视角" Tab。

#### Scenario: Dashboard 默认展示
- **WHEN** 用户打开 Dashboard
- **THEN** 页面从上到下依次显示：总资产卡片、饼状图（按大类）、纪律表、账户列表

### Requirement: 账户列表紧凑布局
系统 SHALL 使用紧凑的单行布局展示账户列表，每个账户一行：左侧显示账户名称和币种标签，右侧显示总额、现金、持仓数，操作按钮（编辑/删除）使用小图标收到行末。

#### Scenario: 紧凑账户列表
- **WHEN** 用户查看账户列表
- **THEN** 每个账户占一行，信息紧凑排列，无大面积空白

### Requirement: 持仓详情返回按钮位置
系统 SHALL 将账户持仓详情页的返回按钮放置在右上角（而非左上角）。

#### Scenario: 返回按钮位置
- **WHEN** 用户进入某账户的持仓详情页
- **THEN** 右上角显示返回按钮，点击返回账户列表

### Requirement: 视角切换简化
系统 SHALL 移除"资产类别视角" Tab，仅保留账户视角。资产类别的详情通过纪律表的展开行查看。

#### Scenario: 无 Tab 切换
- **WHEN** 用户查看 Dashboard
- **THEN** 纪律表下方直接显示账户列表，无 Tab 切换控件
