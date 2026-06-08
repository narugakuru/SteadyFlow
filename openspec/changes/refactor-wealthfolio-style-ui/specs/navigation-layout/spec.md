## ADDED Requirements

### Requirement: 全局左侧边栏应用外壳

系统 SHALL 在已登录用户的主要业务页面中显示全局左侧边栏与右侧主内容区域。左侧边栏从上到下 SHALL 显示：总览、洞察、账户、活动、净值、管理；其中“管理”仅当当前用户 `role="admin"` 时显示。导航项暂时 SHALL 使用文字标签，不要求设计图标。

#### Scenario: 桌面端侧边栏展示

- **WHEN** 已登录用户在桌面端打开任意主要业务页面
- **THEN** 页面左侧显示固定侧边栏，右侧显示当前路由主内容

#### Scenario: 普通用户侧边栏

- **WHEN** `role="user"` 的用户打开应用
- **THEN** 侧边栏显示总览、洞察、账户、活动、净值，不显示管理

#### Scenario: admin 用户侧边栏

- **WHEN** `role="admin"` 的用户打开应用
- **THEN** 侧边栏额外显示“管理”导航项，指向 `/admin`

#### Scenario: 当前页面高亮

- **WHEN** 用户位于 `/accounts`
- **THEN** 侧边栏“账户”导航项显示为当前激活状态

### Requirement: 已下线页面不在导航展示

系统 SHALL 从全局导航中移除“市场”和“股价更新”。用户不应再通过主导航进入 `/market` 或 `/batch-update`。

#### Scenario: 导航不显示市场

- **WHEN** 已登录用户查看全局侧边栏
- **THEN** 侧边栏不显示“市场”导航项

#### Scenario: 导航不显示股价更新

- **WHEN** 已登录用户查看全局侧边栏
- **THEN** 侧边栏不显示“股价更新”导航项

### Requirement: 活动导航文案

系统 SHALL 在导航中将原交易页面显示为“活动”。首版实现 MAY 保留底层路由 `/transactions`，但导航文案和页面入口 MUST 使用“活动”。

#### Scenario: 活动导航跳转

- **WHEN** 用户点击侧边栏“活动”
- **THEN** 系统打开交易/活动记录页面

#### Scenario: 交易路由兼容

- **WHEN** 首版实现保留 `/transactions` 路由
- **THEN** 导航仍显示“活动”，不显示“交易”

### Requirement: 左下角设置入口

系统 SHALL 在侧边栏左下角提供“设置”入口。点击后弹出现有设置弹窗，不进行页面跳转。

#### Scenario: 打开设置弹窗

- **WHEN** 用户点击侧边栏左下角“设置”
- **THEN** 系统打开配置弹窗，包含现有资产类别、阈值、颜色模式、净值时区与数据源配置

## MODIFIED Requirements

### Requirement: 配置入口

系统 SHALL 在全局侧边栏底部提供配置入口，点击后弹出配置弹窗，不跳转页面。

#### Scenario: 打开配置弹窗

- **WHEN** 用户点击侧边栏中的“设置”
- **THEN** 弹出资产类别配置弹窗，显示当前用户的资产类别配置，不跳转页面

### Requirement: 全局页面容器宽度统一

系统 SHALL 通过共享应用外壳统一主要业务页面的内容区域。桌面端主内容区域 MUST 位于侧边栏右侧，并在不同业务页面之间保持一致的水平边距与最大可读宽度策略；总览与洞察页面 MAY 使用更宽的可视化区域，账户、活动、净值、管理页面 MUST 保持稳定可读的内容宽度。页面不得再依赖顶部导航栏内层容器宽度作为全站布局基准。

#### Scenario: 业务页面位于侧边栏右侧

- **WHEN** 用户在桌面端访问总览、洞察、账户、活动、净值或管理页面
- **THEN** 页面主内容显示在侧边栏右侧，并共享一致的外壳边距

#### Scenario: 可视化页面允许更宽内容

- **WHEN** 用户访问总览或洞察页面
- **THEN** 页面可使用比旧 `max-w-5xl` 更宽的图表区域，但内容不得与侧边栏重叠

#### Scenario: 操作页面保持可读宽度

- **WHEN** 用户访问账户、活动、净值或管理页面
- **THEN** 表格、表单与列表保持稳定可读宽度，不因新外壳出现横向溢出

## REMOVED Requirements

### Requirement: 全局顶部导航栏

**Reason**: Primary navigation is replaced by the new left sidebar application shell.
**Migration**: Use “全局左侧边栏应用外壳” and related sidebar requirements.

### Requirement: 导航栏响应式

**Reason**: The old top navigation and hamburger drawer model no longer describes the new shell.
**Migration**: Use the responsive application shell requirements in `mobile-responsive`.
