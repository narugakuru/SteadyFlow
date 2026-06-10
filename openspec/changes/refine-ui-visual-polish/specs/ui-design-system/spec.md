## ADDED Requirements

### Requirement: 统一语义色 Token

系统 SHALL 在 `globals.css` 中以 CSS 变量形式集中定义视觉语义色，业务组件 MUST 通过这些 token（或映射到 token 的 Tailwind 类）引用颜色，MUST NOT 在组件内硬编码十六进制颜色或 `slate/blue/white` 等固定调色板类名。语义色 token SHALL 至少覆盖：状态色 `--status-success / --status-warning / --status-danger`、排序高亮色 `--sort-active`。盈亏方向色 MUST 继续由现有 `colorMode`（A股正红负绿 / 美股正绿负红）逻辑决定，但其具体色值 SHALL 来自语义 token 而非散落的硬编码值。

#### Scenario: 状态进度条引用语义 token

- **WHEN** 纪律表资产类别进度条根据 `status` 渲染 danger/warning/success 颜色
- **THEN** 颜色来自 `--status-danger / --status-warning / --status-success` token，而不是组件内联的 `#ef4444 / #eab308 / #22c55e`

#### Scenario: 排序高亮引用语义 token

- **WHEN** 纪律表某列处于激活排序状态
- **THEN** 高亮文字与排序箭头颜色来自 `--sort-active` token，而不是硬编码的 `text-blue-600`

#### Scenario: 组件不再硬编码调色板类

- **WHEN** 审查纪律表、账户列表、资产趋势等业务组件
- **THEN** 这些组件不包含硬编码的 `text-slate-*`、`bg-white/*`、`hover:bg-slate-50` 等绕过设计系统的类名

### Requirement: 暗色模式可用性

系统 SHALL 确保已定义的 `.dark` CSS 变量在业务页面真正生效，业务组件 MUST NOT 使用会在暗色模式下错乱的写死浅色值。系统 SHALL 提供一个主题切换入口，支持 `light / dark / system` 三种模式，并将用户偏好持久化。主题切换 SHALL 通过 `next-themes` 实现，避免首屏闪烁（FOUC）。

#### Scenario: 切换到暗色模式后颜色正确

- **WHEN** 用户将主题切换为暗色
- **THEN** 总览、纪律表、账户、洞察等页面的背景、文字、卡片、状态色均按 `.dark` token 正确渲染，无残留的写死浅色

#### Scenario: 主题偏好持久化

- **WHEN** 用户选择某个主题后刷新页面
- **THEN** 页面恢复用户上次选择的主题，且首屏不出现明暗闪烁

#### Scenario: 跟随系统主题

- **WHEN** 用户选择 `system` 模式且操作系统处于暗色
- **THEN** 应用呈现暗色主题

### Requirement: 排版刻度规范

系统 SHALL 建立一套清晰的排版刻度并在业务页面统一使用，至少覆盖 display（总资产巨号）、h1/h2（页面与区块标题）、body（正文）、caption（辅助说明）几档。各档之间 MUST 有可辨识的层级过渡，MUST NOT 出现"巨号数字直接跳到 caption 小字、缺少中间档"的断层。

#### Scenario: 总资产区存在层级过渡

- **WHEN** 用户查看总览资产曲线区的总资产、盈亏与快照说明
- **THEN** 总资产为 display 档，盈亏为介于 display 与 caption 之间的中间档，快照说明为 caption 档，三者层级清晰过渡

### Requirement: 展开/收起图标与过渡

系统 SHALL 在可展开列表（纪律表资产类别、账户列表）中使用 `lucide-react` 图标（`ChevronDown / ChevronRight` 或等价旋转图标）表达展开状态，MUST NOT 使用 `▼ / ▶` 文本字符。展开/收起 SHALL 带有图标旋转或明细区高度/透明度过渡，避免瞬时跳变。

#### Scenario: 展开图标使用 lucide

- **WHEN** 用户查看可展开的资产类别行或账户行
- **THEN** 展开指示符为 lucide 矢量图标，而不是 `▼ / ▶` 文本字符

#### Scenario: 展开带过渡动效

- **WHEN** 用户点击展开或收起某行
- **THEN** 图标平滑旋转，明细区以过渡方式出现或消失，而不是瞬时切换

### Requirement: 骨架屏加载态

系统 SHALL 为缓存优先读取的页面级加载场景提供与最终布局一致的骨架屏（skeleton）占位，替代占据大块空白的全屏 spinner。骨架屏 MUST 与真实内容布局结构接近，以消除"加载占位 → 内容突现"的布局跳动。短时操作（如按钮内联加载）SHALL 继续使用 `LoadingSpinner`。

#### Scenario: 总览首屏使用骨架屏

- **WHEN** 用户打开总览页且数据尚未就绪
- **THEN** 页面展示与资产曲线/纪律表结构一致的骨架占位，而不是居中的全屏 spinner

#### Scenario: 内联操作仍用 spinner

- **WHEN** 用户点击"更新股价"等触发短时异步操作的按钮
- **THEN** 按钮内部仍显示小尺寸 `LoadingSpinner` 表示进行中

### Requirement: 按钮层级原则

系统 SHALL 在每个操作区遵循清晰的按钮层级：主操作（primary）每个区域至多一个，次要操作 SHALL 使用 `secondary / outline`，低权重操作（如导出）SHALL 使用 `ghost / outline`。MUST NOT 将同一操作区的全部按钮渲染为同款主按钮。

#### Scenario: 总览操作区区分主次

- **WHEN** 用户查看总览资产配置纪律区的操作按钮
- **THEN** "更新股价"为唯一主按钮，"交易"为次级样式，"导出持仓"为低权重（ghost/outline）样式
