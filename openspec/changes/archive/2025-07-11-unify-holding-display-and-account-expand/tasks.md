## 1. 统一持仓行组件

- [x] 1.1 创建 `src/components/holding-row.tsx` 共享组件，实现两行布局：第一行（名称+小字代码、市值、收益金额+收益率）、第二行（份额/均价/股价/占比 + 操作按钮）。支持 `compact`（交易+编辑）和 `full`（交易+编辑+交易记录+删除）两种操作模式，支持 `showAccountName` 显示账户名标签。交易按钮弹出 TransactionForm，编辑按钮弹出 HoldingEditDialog

## 2. 纪律表展开区域升级

- [x] 2.1 改造 `discipline-table.tsx` 的展开区域，将原有的简单 flex 行替换为 `HoldingRow` 组件（compact 模式 + showAccountName），移除旧的内联持仓展示代码

## 3. 账户页改为展开/折叠模式

- [x] 3.1 改造 `account-list.tsx`：移除 `onSelectAccount` prop，改为内部展开/折叠状态管理（expanded Set）；点击账户行展开/折叠详情区域；展开区域显示账户摘要（总额/持仓/现金）、编辑账户按钮、添加持仓按钮
- [x] 3.2 在 `account-list.tsx` 展开区域中集成持仓列表：fetch holdings 数据，按 accountId 过滤，使用 `HoldingRow`（full 模式）展示，包含添加持仓弹窗（复用 HoldingForm）和删除持仓功能
- [x] 3.3 简化 `accounts/page.tsx`：移除 selectedAccount 子页面切换逻辑，AccountList 不再需要 onSelectAccount；将 URL 参数 accountId 传递给 AccountList 用于自动展开；传入 rates/totalAssetCny/colorMode 等数据供 HoldingRow 使用

## 4. 清理和验证

- [x] 4.1 确认 `holdings-panel.tsx` 不再被任何页面引用后，在 accounts/page.tsx 中移除相关 import；确保纪律表和账户页的持仓展示格式一致
