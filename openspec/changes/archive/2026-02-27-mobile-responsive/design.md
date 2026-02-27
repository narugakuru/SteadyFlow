## Context

当前应用使用 Tailwind CSS 4 + shadcn/ui，布局完全面向桌面端：

- 所有页面使用 `max-w-4xl mx-auto p-6` 固定容器
- 导航栏为横向排列，7+ 个导航项在移动端溢出
- 纪律表使用 `<table>` 六列布局，移动端严重截断
- HoldingRow 使用 `flex justify-between` 两行布局，操作按钮在小屏被挤出视口
- Dialog 使用 `fixed top-[50%] left-[50%] translate` 居中定位，移动端可能超出屏幕
- 表单网格使用 `grid-cols-2/3`，移动端无降级

项目使用 Tailwind 响应式断点（sm:640px, md:768px, lg:1024px），但目前几乎没有使用。

## Goals / Non-Goals

**Goals:**

- 所有页面在 320px~768px 宽度下可正常浏览和操作
- 导航栏移动端可用（汉堡菜单 + Sheet 抽屉）
- 纪律表移动端改为卡片式布局，信息完整可读
- HoldingRow 移动端垂直堆叠，操作按钮始终可见
- Dialog 移动端全宽显示，内容可滚动
- 表单网格移动端降为单列
- 使用同一套代码，通过 Tailwind 断点渐进增强，不维护两套 UI

**Non-Goals:**

- 不做原生 App 或 PWA
- 不做平板专属布局（平板走桌面布局即可）
- 不改变任何业务逻辑或 API
- 不新增 CSS 框架或依赖

## Decisions

### D1: 移动端断点策略 — mobile-first + md 断点

采用 `md:` (768px) 作为主要断点。768px 以下为移动端布局，768px 以上为桌面端布局。

理由：当前导航项较多（7个），768px 是合理的切换点。Tailwind 默认 `md:768px` 与常见平板竖屏宽度吻合。

### D2: 导航栏 — shadcn Sheet 组件实现抽屉菜单

移动端：左侧显示 Logo，右侧显示汉堡菜单按钮（☰），点击弹出 Sheet 侧边抽屉，内含垂直排列的导航项 + 用户信息 + 登出。
桌面端：保持现有横向导航栏不变。

使用 shadcn/ui 的 Sheet 组件（基于 Radix Dialog），项目已有 Radix 依赖，零新增依赖。

替代方案：自己写 CSS 抽屉 → 需要处理动画、焦点管理、无障碍，不如用现成的 Sheet。

### D3: 纪律表 — md 以下隐藏 table，显示卡片列表

移动端用 `<div>` 卡片列表替代 `<table>`，每个资产类别一张卡片，垂直排列关键信息。
桌面端保持现有 table 不变。

通过 `hidden md:block` / `md:hidden` 切换两种渲染，共享同一数据和交互逻辑。

### D4: HoldingRow — 移动端三行垂直布局

移动端改为三行：

1. 名称 + ticker + 账户标签
2. 市值 + 盈亏
3. 详细信息（份额/股价/占比）+ 操作按钮

桌面端保持现有两行布局。

### D5: Dialog — 移动端底部弹出 + 可滚动

修改 DialogContent：移动端改为 `fixed bottom-0 left-0 right-0` 底部弹出，`max-h-[85vh] overflow-y-auto`，圆角只在顶部。
桌面端保持居中弹窗。

### D6: 页面容器 — 响应式 padding

`max-w-4xl` 改为 `max-w-4xl mx-auto px-4 md:px-6 py-4 md:py-6`，移动端减少内边距。

### D7: 表单网格 — 移动端单列

所有 `grid-cols-2` 改为 `grid-cols-1 md:grid-cols-2`，`grid-cols-3` 改为 `grid-cols-1 md:grid-cols-3`。

### D8: viewport meta

在 layout.tsx 的 `<html>` 或 metadata 中确保有 `viewport: width=device-width, initial-scale=1`（Next.js 默认已有，需确认）。

## Risks / Trade-offs

- [纪律表双渲染] 移动端卡片和桌面端 table 是两套 JSX → 通过提取共享数据逻辑和子组件（如状态 Badge、进度条）来减少重复
- [Dialog 底部弹出] 修改 shadcn 基础组件可能影响所有使用 Dialog 的地方 → 这正是我们想要的全局效果，统一改一处即可
- [测试覆盖] 纯 CSS 响应式变更难以自动化测试 → 依赖手动在浏览器 DevTools 中切换视口验证
