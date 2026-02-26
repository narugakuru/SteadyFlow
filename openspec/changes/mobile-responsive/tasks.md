## 1. 基础设施

- [x] 1.1 确认 viewport meta 配置正确（Next.js metadata）
- [x] 1.2 添加 shadcn Sheet 组件（用于移动端导航抽屉）

## 2. 导航栏响应式

- [x] 2.1 改造 navbar.tsx：移动端显示汉堡菜单按钮，隐藏横向导航项；桌面端保持不变
- [x] 2.2 实现 Sheet 抽屉导航：垂直排列导航项 + 用户信息 + 登出，点击导航后自动关闭

## 3. 页面容器与标题响应式

- [x] 3.1 所有页面 page.tsx 容器改为响应式 padding（px-4 md:px-6 py-4 md:py-6）
- [x] 3.2 页面标题改为响应式字号（text-xl md:text-2xl）

## 4. Dialog 移动端适配

- [x] 4.1 修改 dialog.tsx DialogContent：移动端底部弹出、全宽、max-h-[85vh]、可滚动、顶部圆角
- [x] 4.2 验证所有弹窗（HoldingEditDialog、TransactionForm、AccountForm、AssetClassSettings）在移动端正常显示

## 5. 纪律表移动端卡片布局

- [x] 5.1 discipline-table.tsx 添加移动端卡片视图（hidden md:block / md:hidden 切换）
- [x] 5.2 卡片内包含名称、进度条、百分比、金额、盈亏、状态标签，点击展开持仓

## 6. HoldingRow 移动端布局

- [x] 6.1 holding-row.tsx 移动端改为垂直三行布局，操作按钮始终可见
- [x] 6.2 确保 compact 和 full 两种 actions 模式在移动端都正常

## 7. 表单与其他组件适配

- [x] 7.1 所有表单多列网格改为 grid-cols-1 md:grid-cols-2（或 md:grid-cols-3）
- [x] 7.2 account-list.tsx 移动端布局适配
- [x] 7.3 portfolio-chart.tsx、deviation-chart.tsx 确保小屏正常缩放
- [x] 7.4 rebalance-panel.tsx 移动端布局适配
- [x] 7.5 其他页面（transactions、snapshots、batch-update、market）容器和组件移动端检查
