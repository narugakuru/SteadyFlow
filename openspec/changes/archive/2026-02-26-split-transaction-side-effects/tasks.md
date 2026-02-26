## 1. 数据库迁移

- [x] 1.1 新增 `affect_cash` 和 `affect_holding` 列（INTEGER, NOT NULL, DEFAULT 1），从 `affect_balance` 迁移数据，删除 `affect_balance` 列
- [x] 1.2 更新 `src/db/schema.ts`：`affectBalance` 替换为 `affectCash` + `affectHolding`

## 2. 类型定义更新

- [x] 2.1 更新 `src/lib/types.ts`：Transaction 接口中 `affectBalance` 替换为 `affectCash` + `affectHolding`

## 3. 交易 API 重构

- [x] 3.1 更新 `src/app/api/transactions/route.ts` POST：接收 `affectCash`/`affectHolding`（兼容旧 `affectBalance`），副作用逻辑拆分为独立的现金和持仓控制
- [x] 3.2 更新 `src/app/api/transactions/route.ts` GET：返回 `affectCash` + `affectHolding` 字段

## 4. 前端交易表单更新

- [x] 4.1 更新 `src/components/transaction-form.tsx`：单开关拆为两个独立 Switch（影响账户现金 / 影响持仓数据），buy/sell 显示两个，dividend/deposit/withdraw 只显示现金开关

## 5. 交易列表页更新

- [x] 5.1 更新 `src/app/transactions/page.tsx`：交易记录展示适配新字段，显示副作用状态标签（"仅记录"/"不扣现金"/"不更新持仓"）

## 6. 验证

- [x] 6.1 构建验证通过，全局搜索无残留 `affectBalance` / `affect_balance` 引用（API 中保留向后兼容代码）
