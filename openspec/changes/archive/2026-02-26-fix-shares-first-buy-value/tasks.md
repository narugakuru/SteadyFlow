## 1. 修复交易 API 副作用逻辑

- [x] 1.1 修复 buy case：shares 模式买入时用 txPrice 更新 holding.price，marketValue 改为 newShares * newPrice
- [x] 1.2 修复 sell case：shares 模式卖出时用 txPrice 更新 holding.price，marketValue 改为 newShares * newPrice

## 2. 更新 Spec 文档

- [x] 2.1 同步修正主 spec（openspec/specs/transaction-management/spec.md）中 shares 模式买入/卖出 scenario 的市值公式描述
