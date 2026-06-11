## 1. 语义色 Token 打底

- [x] 1.1 在 `globals.css` 的 `:root` 新增语义色变量：`--status-success / --status-warning / --status-danger / --sort-active`（亮色值）
- [x] 1.2 在 `globals.css` 的 `.dark` 补充上述语义色变量的暗色值
- [x] 1.3 在 `@theme inline` 中将语义色暴露为 `--color-status-* / --color-sort-active`，供 Tailwind 类引用
- [x] 1.4 新增集中的图表色 helper（在 `lib/visualization` 下），统一从主题 token 读取资产曲线、占比、热力图、状态进度条所需色值

## 2. 业务组件去硬编码 + 图标替换 + 按钮配色

- [x] 2.1 `discipline-table.tsx`：进度条 inline `#ef4444/#eab308/#22c55e` 改为引用 `--status-*` token（桌面与移动两处）
- [x] 2.2 `discipline-table.tsx`：排序高亮 `text-blue-600`、`text-slate-300/400/500`、`hover:bg-slate-50`、`bg-white/90` 等替换为语义/主题 token 类
- [x] 2.3 `discipline-table.tsx`：资产类别展开指示符 `▼/▶` 替换为 `ChevronRight/ChevronDown` lucide 图标并加旋转过渡（桌面与移动）
- [x] 2.4 `discipline-table.tsx`：展开明细区加入 height/opacity 过渡（复用 `tw-animate-css`）
- [x] 2.5 `account-list.tsx` 与 `account-holding-table.tsx`：清理硬编码 slate/white/hex 色，展开图标替换为 lucide 并加过渡
- [x] 2.6 `overview-asset-trend.tsx`：图表 stroke/fill/刻度/Tooltip 表面色改为从图表色 helper / 主题 token 读取，去除写死浅色
- [x] 2.7 总览 `page.tsx`：操作区按钮统一复用全局主按钮黑底白字配色，"更新股价"、"交易"、"导出持仓"保持一致

## 3. 暗色模式与主题切换

- [x] 3.1 添加 `next-themes` 依赖（pinned 版本）
- [x] 3.2 在 `layout.tsx` 包裹 `ThemeProvider`（`attribute="class"`、`defaultTheme="system"`、`enableSystem`），`<html>` 加 `suppressHydrationWarning`
- [x] 3.3 在 `AppShell` 侧栏底部（登出区相邻）新增 light/dark/system 主题切换入口，桌面与移动菜单各一处
- [x] 3.4 全量 grep 残留硬编码色模式（`text-slate`、`bg-white`、`text-blue`、`#[0-9a-f]{6}`）并逐一替换或确认无碍
- [x] 3.5 洞察图表（`insights-composition-chart.tsx`、`insights-heatmap.tsx`）配色改为引用调色 token，暗色下可辨识

## 4. 骨架屏加载态

- [x] 4.1 新增基础 `Skeleton` 块组件（`ui/skeleton.tsx`）
- [x] 4.2 为总览页拼装与资产曲线/纪律表结构一致的骨架占位，替换全屏 `LoadingSpinner`
- [x] 4.3 为洞察页、账户页拼装结构相近的骨架占位，替换全屏 spinner
- [x] 4.4 确认按钮内联加载仍使用 `LoadingSpinner`（不被骨架屏替代）

## 5. 排版刻度与收尾

- [x] 5.1 在 `overview-asset-trend.tsx` 调整总资产/盈亏/快照说明的字号档位，补齐中间层级过渡
- [x] 5.2 统一各页面标题（h1/h2）与正文/caption 的排版刻度引用
- [x] 5.3 空状态优化：净值历史不足、无持仓等空态从单行灰字升级为图标 + 引导动作（可选低优先）

## 6. 验证

- [x] 6.1 运行 `npm run lint` 与 `npm run typecheck`（或项目对应脚本），修复新引入问题
- [x] 6.2 亮色主题人工走查：总览、纪律表（桌面/移动）、账户、洞察、净值页
- [x] 6.3 暗色主题人工走查同上页面，确认无残留写死浅色、状态色/图表色正确
- [x] 6.4 验证主题切换无 FOUC、偏好刷新后保持
- [x] 6.5 验证冷启动首屏骨架屏与真实内容切换无明显布局位移
- [x] 6.6 更新 `project_overview.md` 进展日志，并同步受影响主 specs
