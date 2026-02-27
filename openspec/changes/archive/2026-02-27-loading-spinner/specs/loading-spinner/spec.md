## ADDED Requirements

### Requirement: LoadingSpinner 组件提供旋转动画

系统 SHALL 提供 `LoadingSpinner` 组件（位于 `src/components/ui/loading-spinner.tsx`），展示旋转动画图标作为加载状态指示器。组件 SHALL 使用 Lucide `Loader2` 图标配合 Tailwind `animate-spin` 实现旋转效果。

#### Scenario: 默认渲染

- **WHEN** 使用 `<LoadingSpinner />` 无任何 props
- **THEN** 渲染一个居中的旋转动画图标，尺寸为 md（24px），无附加文字

### Requirement: LoadingSpinner 支持三种尺寸

组件 SHALL 接受 `size` prop，支持 `sm`（16px）、`md`（24px，默认）、`lg`（32px）三种尺寸。

#### Scenario: 小尺寸渲染

- **WHEN** 使用 `<LoadingSpinner size="sm" />`
- **THEN** 图标尺寸为 16px（`w-4 h-4`）

#### Scenario: 大尺寸渲染

- **WHEN** 使用 `<LoadingSpinner size="lg" />`
- **THEN** 图标尺寸为 32px（`w-8 h-8`）

### Requirement: LoadingSpinner 支持可选文字

组件 SHALL 接受 `text` prop，当提供时在图标下方显示文字提示。

#### Scenario: 带文字渲染

- **WHEN** 使用 `<LoadingSpinner text="加载中..." />`
- **THEN** 图标下方显示"加载中..."文字，颜色为 `text-muted-foreground`

#### Scenario: 无文字渲染

- **WHEN** 未提供 `text` prop
- **THEN** 仅显示旋转图标，无文字

### Requirement: LoadingSpinner 支持自定义样式

组件 SHALL 接受 `className` prop，允许外部覆盖或扩展容器样式。

#### Scenario: 自定义 className

- **WHEN** 使用 `<LoadingSpinner className="min-h-[50vh]" />`
- **THEN** 容器应用 `min-h-[50vh]` 样式

### Requirement: LoadingSpinner 页面级居中布局

组件容器 SHALL 默认使用 `flex items-center justify-center` 居中布局，适用于页面级加载场景。

#### Scenario: 页面级使用

- **WHEN** 在页面中作为全屏加载占位使用
- **THEN** spinner 在容器内水平和垂直居中显示
