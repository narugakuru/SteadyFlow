## 1. 饼图 Tooltip 百分比修复

- [x] 1.1 修改 `portfolio-chart.tsx`：为内环 targetData 数据项添加 `ring: "inner"` 标记，为外环 outerData 数据项添加 `ring: "outer"` 标记
- [x] 1.2 修改 Tooltip formatter：根据 `props.payload.ring` 区分格式，inner 显示 `{value}%`，outer 显示 `¥{value.toLocaleString()}`

## 2. 账户列表展开状态保持

- [x] 2.1 检查 `accounts/page.tsx` 父组件的 refresh 逻辑，确认 AccountList 是否因 re-render 被 unmount/remount
- [x] 2.2 修改 `account-list.tsx` 的 `handleDataChange` 回调，确保 `onRefresh()` 和 `fetchHoldings()` 执行后不影响 expanded state
- [x] 2.3 如果父组件导致 unmount，修复父组件的状态管理，确保 AccountList 组件实例稳定

## 3. 股价更新页 shares 模式增强

- [x] 3.1 修改 `batch-update/page.tsx` 的 edits state 结构，支持同时记录 `{ marketValue, price }` 对
- [x] 3.2 修改 shares 模式持仓行 UI：显示市值（可编辑）、股数（只读）、股价（可编辑）三个字段，股数为 0 时股价输入框禁用
- [x] 3.3 实现联动计算逻辑：编辑股价 → 市值 = 股数 × 新股价；编辑市值 → 股价 = 新市值 / 股数
- [x] 3.4 修改 `handleSave` 提交逻辑，shares 模式持仓同时发送 marketValue 和 price
- [x] 3.5 修改 `PUT /api/batch-update` API：holdings payload 支持可选 `price` 字段，有 price 时同时更新 holdings.price
