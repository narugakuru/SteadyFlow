## Why

当前 UI 工程底子扎实（shadcn 变量体系、cva 按钮、共享外壳与缓存优先策略），但视觉打磨明显落后于工程质量。核心问题集中在三点：业务组件大量硬编码颜色（`text-blue-600`、`text-slate-300`、`#ef4444/#eab308/#22c55e` inline style 等）绕过设计系统，导致已定义的 `.dark` 暗色变量实际无法生效、语义色三套各自为政；用文本字符 `▼/▶` 当展开图标，渲染粗细与基线不稳定；加载态统一是全屏 spinner，配合缓存优先读取会出现"spinner → 内容突现"的布局跳动。这些细节累积起来削弱了整体的优雅感与使用舒适度。

## What Changes

- 新增统一语义色 token：将状态色（danger/warning/success）、排序高亮色、盈亏语义色收敛进 CSS 变量，业务组件停止硬编码 slate/blue/white 与十六进制颜色。
- 修复暗色模式可用性：让已存在的 `.dark` 变量真正生效（移除写死的浅色），并补充主题切换入口（`next-themes`）。
- 图标统一：展开/收起的 `▼/▶` 文本字符替换为 `lucide-react` 的 `ChevronDown/ChevronRight`，并加旋转过渡。
- 加载态升级：总览、洞察、账户等页面的全屏 spinner 替换为与最终布局一致的骨架屏（skeleton），消除首屏跳动。
- 按钮配色规范：总览操作区"更新股价/交易/导出"统一复用全局主按钮黑底白字样式，保持亮/暗主题下均清晰可读。
- 排版刻度规范：建立 display/h1/h2/body/caption 清晰档位，修正总资产巨号字与周边小字之间缺中间档的问题。
- 展开/收起过渡动效：纪律表与账户列表展开明细增加高度/透明度过渡。
- 空状态优化：净值历史、无持仓等空态从单行灰字升级为图标 + 引导动作。

## Capabilities

### New Capabilities

- `ui-design-system`: 统一的视觉设计系统规范，覆盖语义色 token、暗色模式可用性、排版刻度、图标使用约定、骨架屏加载态与全局主按钮配色原则。

### Modified Capabilities

- `dashboard`: 总览操作按钮区分主次层级；纪律表展开图标改用 lucide 图标并带过渡；状态进度条颜色改用语义 token。
- `mobile-responsive`: 移动端纪律卡片/账户卡片的展开图标、状态色与过渡行为同步对齐设计系统。
- `loading-spinner`: 页面级加载态从全屏 spinner 扩展为支持骨架屏占位，明确缓存优先场景下的加载呈现规则。
- `visualization-charts`: 图表配色（资产曲线、占比、热力图）引用统一语义 token，确保亮/暗模式一致。

## Impact

- 样式与 token：`src/app/globals.css`（新增语义色变量、主题切换支持）。
- 组件：`discipline-table.tsx`、`account-list.tsx`、`account-holding-table.tsx`、`overview-asset-trend.tsx`、`app-shell.tsx`、`ui/loading-spinner.tsx`、`ui/button.tsx`（消化层级）、洞察/账户/总览页 `page.tsx`。
- 依赖：新增 `next-themes`（主题切换）。
- 不涉及后端、API、数据模型与数据库迁移；纯前端展示层变更。
