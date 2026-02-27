## 1. 组件创建

- [ ] 1.1 创建 `src/components/ui/loading-spinner.tsx`，实现 LoadingSpinner 组件（Loader2 图标 + animate-spin，支持 size sm/md/lg、text、className props）

## 2. 页面替换

- [ ] 2.1 替换 Dashboard（`src/app/page.tsx`）加载占位为 LoadingSpinner
- [ ] 2.2 替换账户管理页（`src/app/accounts/page.tsx`）加载占位和 Suspense fallback 为 LoadingSpinner
- [ ] 2.3 替换交易记录页（`src/app/transactions/page.tsx`）加载占位和 Suspense fallback 为 LoadingSpinner
- [ ] 2.4 替换净值历史页（`src/app/netvalue/page.tsx`）加载占位为 LoadingSpinner
- [ ] 2.5 替换股价更新页（`src/app/batch-update/page.tsx`）加载占位为 LoadingSpinner
- [ ] 2.6 替换市场概览页（`src/app/market/page.tsx`）加载占位为 LoadingSpinner
- [ ] 2.7 替换管理后台统计页（`src/app/admin/page.tsx`）加载占位为 LoadingSpinner
- [ ] 2.8 替换用户管理页（`src/app/admin/users/page.tsx`）加载占位为 LoadingSpinner

## 3. 验证

- [ ] 3.1 全局搜索确认无遗漏的"加载中..."纯文本（排除 LoadingSpinner 组件自身）
- [ ] 3.2 类型检查通过（`npx tsc --noEmit`）
