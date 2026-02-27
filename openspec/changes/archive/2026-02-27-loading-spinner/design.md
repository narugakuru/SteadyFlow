## Context

当前项目所有页面（Dashboard、账户、交易、净值、股价更新、市场、管理后台）在数据加载时统一显示纯文本"加载中..."，无任何视觉动画。项目使用 Tailwind CSS 4 + shadcn/ui 组件体系，已有完善的 UI 组件目录 `src/components/ui/`。

现有加载模式：

- 页面级：`useState(true)` + 条件渲染纯文本
- Hook 级：`useFetch` 返回 `loading` 状态
- Suspense：`fallback={<div>加载中...</div>}`

## Goals / Non-Goals

**Goals:**

- 提供统一的 LoadingSpinner 组件，支持 sm/md/lg 三种尺寸
- 替换所有页面的纯文本加载占位为动画组件
- 保持与 shadcn/ui 设计风格一致（使用 CSS 变量颜色）
- 零新依赖，纯 Tailwind CSS animate 实现

**Non-Goals:**

- 不引入 Skeleton 骨架屏（后续可独立实现）
- 不改变现有加载逻辑（useState/useFetch/Suspense 模式不变）
- 不添加页面级 loading.tsx（Next.js route-level loading）
- 不处理表单提交等操作级 loading 状态

## Decisions

### 1. 纯 CSS 旋转动画 vs 第三方动画库

选择纯 Tailwind CSS `animate-spin`。理由：零依赖、性能好、与项目风格一致。Framer Motion 等库对一个简单 spinner 来说过重。

### 2. 组件放置位置

放在 `src/components/ui/loading-spinner.tsx`，遵循 shadcn/ui 组件目录约定。作为基础 UI 组件供全局使用。

### 3. 组件 API 设计

```tsx
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"; // 默认 md
  text?: string; // 可选文字，默认无
  className?: string; // 允许外部覆盖样式
}
```

选择 size 枚举而非自由数值，保持设计一致性。text 可选，页面级使用时可加"加载中..."，局部使用时可省略。

### 4. 动画样式

使用 Lucide 的 `Loader2` 图标 + `animate-spin`，与项目已有的 lucide-react 图标库一致。颜色使用 `text-muted-foreground` 融入 shadcn 主题。

## Risks / Trade-offs

- [视觉一致性] 所有页面统一为同一种 spinner，可能对某些场景（如大面积空白）不够丰富 → 后续可补充 Skeleton 组件
- [替换遗漏] 手动替换可能遗漏某些加载文本 → 全局搜索"加载中"确保覆盖
