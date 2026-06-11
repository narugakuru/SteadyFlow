## Purpose

定义 InvestManage 前端视觉设计系统的业务约束与验收标准，覆盖语义色 token、暗色模式、排版刻度、展开图标、骨架屏和全局主按钮配色。

## Requirements

### Requirement: 统一语义色 Token

系统 SHALL 在 `globals.css` 中以 CSS 变量形式集中定义视觉语义色，业务组件 MUST 通过这些 token（或映射到 token 的 Tailwind 类）引用颜色，MUST NOT 在组件内硬编码十六进制颜色或 `slate/blue/white` 等固定调色板类名。语义色 token SHALL 至少覆盖：状态色 `--status-success / --status-warning / --status-danger`、排序高亮色 `--sort-active`。盈亏方向色 MUST 继续由现有 `colorMode`（A股正红负绿 / 美股正绿负红）逻辑决定，但其具体色值 SHALL 来自语义 token。

#### Scenario: 状态进度条引用语义 token

- **WHEN** 纪律表资产类别进度条根据 `status` 渲染 danger/warning/success 颜色
- **THEN** 颜色来自 `--status-danger / --status-warning / --status-success` token，而不是组件内联的十六进制色值

#### Scenario: 排序高亮引用语义 token

- **WHEN** 纪律表或账户表某列处于激活排序状态
- **THEN** 高亮文字与排序箭头颜色来自 `--sort-active` token

### Requirement: 暗色模式可用性

系统 SHALL 确保已定义的 `.dark` CSS 变量在业务页面真正生效，业务组件 MUST NOT 使用会在暗色模式下错乱的写死浅色值。系统 SHALL 提供一个主题切换入口，支持 `light / dark / system` 三种模式，并将用户偏好持久化。主题切换 SHALL 通过 `next-themes` 实现，避免首屏闪烁。

#### Scenario: 切换到暗色模式后颜色正确

- **WHEN** 用户将主题切换为暗色
- **THEN** 总览、纪律表、账户、洞察等页面的背景、文字、卡片、状态色均按 `.dark` token 正确渲染

#### Scenario: 主题偏好持久化

- **WHEN** 用户选择某个主题后刷新页面
- **THEN** 页面恢复用户上次选择的主题

#### Scenario: 主题切换不产生 hydration mismatch

- **WHEN** 用户刷新应用或首次进入已启用主题切换的页面
- **THEN** 主题切换按钮的 SSR 初始标记与客户端 hydration 初始标记保持一致，不因本地主题偏好导致 `data-variant` 或 class 不匹配

### Requirement: 排版刻度规范

系统 SHALL 建立一套清晰的排版刻度并在业务页面统一使用，至少覆盖 display（总资产巨号）、h1/h2（页面与区块标题）、body（正文）、caption（辅助说明）几档。各档之间 MUST 有可辨识的层级过渡。

#### Scenario: 总资产区存在层级过渡

- **WHEN** 用户查看总览资产曲线区的总资产、盈亏与快照说明
- **THEN** 总资产为 display 档，盈亏为介于 display 与 caption 之间的中间档，快照说明为 caption 档

### Requirement: 展开/收起图标与过渡

系统 SHALL 在可展开列表（纪律表资产类别、账户列表、资产类别视图）中使用 `lucide-react` 图标表达展开状态，MUST NOT 使用 `▼ / ▶` 文本字符。展开/收起 SHALL 带有图标旋转或明细区高度/透明度过渡。

#### Scenario: 展开图标使用 lucide

- **WHEN** 用户查看可展开的资产类别行或账户行
- **THEN** 展开指示符为 lucide 矢量图标，而不是文本字符

### Requirement: 骨架屏加载态

系统 SHALL 为缓存优先读取的页面级加载场景提供与最终布局一致的骨架屏（skeleton）占位，替代占据大块空白的全屏 spinner。短时操作（如按钮内联加载）SHALL 继续使用 `LoadingSpinner`。

#### Scenario: 页面首屏使用骨架屏

- **WHEN** 用户打开总览、洞察、账户或净值页且数据尚未就绪
- **THEN** 页面展示与最终布局结构接近的骨架占位

#### Scenario: 内联操作仍用 spinner

- **WHEN** 用户点击“更新股价”等触发短时异步操作的按钮
- **THEN** 按钮内部仍显示小尺寸 `LoadingSpinner`

### Requirement: 全局主按钮配色

系统 SHALL 将全局主按钮配色统一为 Dashboard“更新股价”按钮的黑底白字样式。总览页操作区的“更新股价”、“交易”、“导出持仓”等主要按钮 MUST 复用该配色；暗色主题下也 MUST 保持白字可读。

#### Scenario: 总览操作区按钮配色统一

- **WHEN** 用户查看总览资产配置纪律区的操作按钮
- **THEN** “更新股价”、“交易”、“导出持仓”均使用全局主按钮黑底白字配色
