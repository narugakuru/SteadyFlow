## 1. 三字段联动编辑组件

- [x] 1.1 创建共享的 `useTriFieldLinked` hook，实现"最后两次编辑锁定，第三个自动计算"逻辑（输入：初始 price/shares/marketValue，输出：三个字段值、各字段 onChange、computedField 标识）
- [x] 1.2 创建共享的 `HoldingEditDialog` 组件，根据 valuationMode 切换 amount/shares 编辑模式：amount 模式显示名称、市值、资产类别；shares 模式显示名称、三字段联动（股价/份额/市值）、资产类别。被计算字段用浅色斜体样式标识。本金由交易记录自动累积，不在编辑弹窗中显示

## 2. 总览页纪律表编辑升级

- [x] 2.1 改造 `discipline-table.tsx` 的 `InlineEditDialog`，替换为使用 `HoldingEditDialog` 组件，需先通过 `/api/holdings` 获取完整持仓数据（含 valuationMode/shares/price）以支持模式判断

## 3. 账户详情页编辑升级 + 快捷交易

- [x] 3.1 改造 `holdings-panel.tsx` 的 `HoldingForm` 编辑模式，shares 模式下使用 `useTriFieldLinked` hook 实现三字段联动编辑
- [x] 3.2 将 `transactions/page.tsx` 中的 `TransactionForm` 提取为独立共享组件 `src/components/transaction-form.tsx`，新增可选 props：`defaultType`、`defaultAccountId`、`defaultHoldingId` 用于预填
- [x] 3.3 在 `holdings-panel.tsx` 的持仓卡片中增加"买入"/"卖出"快捷按钮，点击后弹出 `TransactionForm` 并预填当前账户和持仓

## 4. 交易表单内新建持仓

- [x] 4.1 在 `TransactionForm` 的持仓下拉选择器底部增加"➕ 新建持仓..."选项，点击后弹出简化版 `HoldingForm`（名称、ticker、估值模式、资产类别），创建成功后自动选中新持仓并刷新列表。本金不在此处填写，由交易记录自动累积

## 5. 交叉导航

- [x] 5.1 改造 `accounts/page.tsx` 支持 URL 参数 `accountId`，页面加载时自动选中对应账户并展示持仓详情
- [x] 5.2 改造 `transactions/page.tsx` 支持 URL 参数 `accountId` 预设筛选条件，页面加载时自动应用筛选
- [x] 5.3 在 `holdings-panel.tsx` 的持仓卡片中增加"交易记录 →"链接，跳转到 `/transactions?accountId=X`
- [x] 5.4 在 `transactions/page.tsx` 的交易记录中，将持仓名称渲染为可点击链接，跳转到 `/accounts?accountId=X`
