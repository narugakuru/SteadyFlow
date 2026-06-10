## Context

InvestManage 当前使用 Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui。`globals.css` 已用 shadcn 的 oklch 变量体系定义了完整的亮色与 `.dark` 主题 token，`Button` 用 cva 管理变体，全站有共享 `PageContainer` 与左侧栏应用外壳 `AppShell`，数据层采用 TanStack Query + IndexedDB 缓存优先策略。

问题不在架构，而在视觉打磨与一致性：

- 业务组件（`discipline-table.tsx`、`account-list.tsx` 等）大量硬编码颜色：`text-blue-600`、`text-slate-300/400`、`hover:bg-slate-50`、`bg-white/90`，以及进度条 inline style 写死 `#ef4444 / #eab308 / #22c55e`。
- `.dark` 变量虽已定义但无切换入口，且硬编码浅色会让暗色模式实际错乱——等于"半成品暗色"。
- 展开/收起用 `▼ / ▶` 文本字符（项目已依赖 `lucide-react`）。
- 页面级加载统一是 `LoadingSpinner` 全屏占位，配合缓存优先会出现布局跳动。
- 总览操作区"更新股价/交易/导出"全是同款主按钮，缺视觉重心。

约束：本次为纯前端展示层重构，MUST NOT 触碰后端、API、数据模型与数据库迁移；MUST NOT 改变现有信息架构与业务交互流程（展开逻辑、排序三态、Drawer 行为等保持不变）。

## Goals / Non-Goals

**Goals:**

- 将散落的硬编码颜色收敛进语义/主题 token，业务组件统一引用。
- 让 `.dark` 主题真正可用，并提供无闪烁的主题切换入口。
- 用 lucide 图标替换文本箭头，展开/收起加过渡动效。
- 用骨架屏替换页面级全屏 spinner，消除首屏布局跳动。
- 规范按钮层级（每区至多一个主按钮）与排版刻度。

**Non-Goals:**

- 不重写桌面/移动两套渲染为单一 viewmodel（仅本次提及为后续优化方向，不在范围内）。
- 不调整任何后端 API、数据结构或缓存策略。
- 不改变业务交互语义（排序三态、Drawer 入口、导出 detail 参数等保持现状）。
- 不引入新的 UI 组件库或设计系统框架。

## Decisions

### 1. 语义色用 CSS 变量而非 Tailwind config 扩展

在 `globals.css` 的 `:root` 与 `.dark` 中新增 `--status-success / --status-warning / --status-danger / --sort-active`，通过 `@theme inline` 暴露为 `--color-*` 供 Tailwind 类引用（与现有 token 一致的做法）。

- **为什么**：项目已全面使用 CSS 变量 + `@theme inline` 模式，新增 token 与现有体系一致，且天然支持 `.dark` 覆盖。
- **替代方案**：在 `tailwind.config` 扩展色板——但 Tailwind 4 已转向 CSS-first 配置，且无法自动随 `.dark` 切换，弃用。

### 2. 进度条与图表色从 inline hex 改为 token 引用

进度条状态色改为读取 CSS 变量（如通过 `var(--status-danger)` inline style 或对应 Tailwind 类）。Recharts 的 stroke/fill 因需 JS 传值，统一从一个集中的"图表色 helper"读取 token 值（`getComputedStyle` 或预定义常量映射），确保亮/暗一致。

- **为什么**：Recharts 不直接吃 CSS 类，需要色值字符串；集中到 helper 便于主题切换时统一管理。
- **权衡**：Recharts 主题切换需要重渲染才生效，可接受（主题切换本就触发重渲染）。

### 3. 主题切换用 next-themes

引入 `next-themes`，在 `layout.tsx` 包一层 `ThemeProvider`（`attribute="class"`、`defaultTheme="system"`、`enableSystem`），切换入口放在 `AppShell` 侧栏（设置区附近）。

- **为什么**：`next-themes` 是 Next.js App Router 下处理主题的事实标准，内置防 FOUC 的 inline script，与现有 `.dark` class 策略（`@custom-variant dark (&:is(.dark *))`）天然契合。
- **替代方案**：自建 localStorage + class 切换——重复造轮子且易有首屏闪烁，弃用。

### 4. 骨架屏作为 loading-spinner 能力的补充而非替代

新增轻量 skeleton 占位（可用一个 `Skeleton` 基础块 + 各页面拼装的占位组件），页面级加载切换到骨架屏，按钮内联加载保留 `LoadingSpinner`。

- **为什么**：缓存优先策略下首屏常有数据，骨架屏只在冷启动短暂出现；与最终布局对齐能消除跳动。
- **权衡**：每个页面需手写一个结构相近的占位，有少量重复，但收益（无跳动）明显。

### 5. 图标替换最小侵入

仅替换展开指示符（`▼/▶` → `ChevronRight` 旋转到 `ChevronDown`），用 CSS transform transition 实现旋转，明细区用 max-height/opacity 或现有动画工具（项目已引入 `tw-animate-css`）做过渡。

- **为什么**：`tw-animate-css` 已在 `globals.css` 导入，可复用，避免新增动画依赖。

## Risks / Trade-offs

- [暗色模式遗漏硬编码色] → 全量 grep `text-slate`、`bg-white`、`#[0-9a-f]{6}`、`text-blue` 等模式逐一替换；在亮/暗两种主题下人工走查总览、纪律表、账户、洞察、净值页。
- [Recharts 色值与 CSS token 不同步] → 集中到单一图表色 helper，主题切换时图表随页面重渲染读取最新值；必要时用 key 强制 remount。
- [骨架屏与真实布局偏差导致仍有轻微跳动] → 骨架结构按真实组件的容器尺寸/网格对齐编写，验收以"切换无明显位移"为准。
- [next-themes 引入 FOUC] → 使用其官方推荐配置（`suppressHydrationWarning` on `<html>`），依赖其内置 inline script 防闪烁。
- [范围蔓延] → 严守 Non-Goals：不动后端、不改业务交互、不重写双端渲染。

## Migration Plan

纯前端变更，无数据迁移。建议实施顺序（低风险 → 体感升级）：

1. 在 `globals.css` 新增语义色 token（亮/暗），不改组件——无视觉变化，安全打底。
2. 替换组件硬编码色为 token + 图标替换 + 按钮层级（`discipline-table`、`account-list`、`overview-asset-trend`、总览页）。
3. 引入 `next-themes` 与主题切换入口，亮/暗双主题走查。
4. 新增 skeleton，替换页面级 spinner。
5. 排版刻度统一与展开过渡动效收尾。

回滚策略：每步独立可回退；token 新增与组件替换解耦，若组件改动有问题，token 保留无副作用。

## Open Questions

- 主题切换入口的具体落点：侧栏底部独立按钮，还是并入"设置"面板？（倾向侧栏底部独立的小图标切换，与登出区相邻。）
- 是否本次就为登录/注册等 public 页面也适配暗色？（倾向适配，保持一致，但优先级低。）
