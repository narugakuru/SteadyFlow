## Why

当前应用完全按桌面端布局设计（`max-w-4xl` 固定容器 + 横向导航栏 + 多列网格），在手机端访问时页面被压缩到左侧一小块区域，导航栏溢出、标的信息截断（操作按钮不可见）、弹窗偏移无法操作。作为个人投资管理工具，移动端随时查看仓位和执行交易是核心场景，必须适配。

## What Changes

- 导航栏改为响应式：移动端使用汉堡菜单 + 抽屉式侧边栏，桌面端保持现有横向布局
- 页面容器响应式：移除固定 `max-w-4xl`，改为响应式宽度 + 合理的移动端 padding
- 纪律表/持仓行：移动端改为卡片式垂直布局，确保操作按钮可见可点击
- 账户列表：移动端表单网格从多列降为单列
- 弹窗/对话框：移动端改为底部抽屉式或全屏弹窗，确保可滚动可操作
- 图表组件：确保在小屏幕上正确缩放
- 全局增加 viewport meta 和触摸友好的点击区域

## Capabilities

### New Capabilities

- `mobile-responsive`: 全局移动端响应式适配，包括导航栏、页面布局、组件布局、弹窗定位的移动端优化

### Modified Capabilities

- `navigation-layout`: 导航栏从纯横向布局改为响应式（移动端汉堡菜单 + 抽屉）

## Impact

- 影响组件：navbar.tsx、layout.tsx、dialog.tsx、discipline-table.tsx、holding-row.tsx、account-list.tsx、holding-edit-dialog.tsx、transaction-form.tsx、portfolio-chart.tsx、asset-class-view.tsx、rebalance-panel.tsx、deviation-chart.tsx
- 影响页面：所有页面的容器布局（page.tsx）
- 不涉及 API 变更、数据模型变更或新增依赖
- 使用 Tailwind 响应式断点（sm/md/lg）渐进增强，不搞两套 UI
