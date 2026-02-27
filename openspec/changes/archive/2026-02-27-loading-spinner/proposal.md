## Why

当前所有页面的加载状态仅显示纯文本"加载中..."，缺乏视觉反馈，用户体验较差。需要一个统一的加载动画组件，替换全部加载占位，提升整体 UI 品质和一致性。

## What Changes

- 新增 `LoadingSpinner` 通用加载动画组件，支持不同尺寸（sm/md/lg）和可选文字提示
- 替换所有页面（Dashboard、账户、交易、净值、股价更新、市场、管理后台）中的纯文本"加载中..."为 LoadingSpinner 组件
- 替换 Suspense fallback 中的纯文本为 LoadingSpinner 组件
- 更新 `useFetch` hook 的使用处，统一加载 UI

## Capabilities

### New Capabilities

- `loading-spinner`: 全局通用加载动画组件，提供旋转动画 + 可选文字，支持多种尺寸，用于页面级和区块级加载状态展示

### Modified Capabilities

- `dashboard`: 加载状态 UI 从纯文本改为 LoadingSpinner 组件
- `account-management`: 加载状态 UI 从纯文本改为 LoadingSpinner 组件
- `transaction-management`: 加载状态 UI 从纯文本改为 LoadingSpinner 组件
- `daily-netvalue`: 加载状态 UI 从纯文本改为 LoadingSpinner 组件
- `batch-update`: 加载状态 UI 从纯文本改为 LoadingSpinner 组件
- `market-overview`: 加载状态 UI 从纯文本改为 LoadingSpinner 组件
- `admin-panel`: 加载状态 UI 从纯文本改为 LoadingSpinner 组件

## Impact

- 新增文件：`src/components/ui/loading-spinner.tsx`
- 修改文件：8 个页面文件（page.tsx）中的加载占位 UI
- 无 API 变更、无数据模型变更、无新依赖（纯 Tailwind CSS 动画）
