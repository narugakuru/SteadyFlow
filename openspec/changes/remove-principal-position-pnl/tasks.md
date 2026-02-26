## 1. 数据模型层

- [x] 1.1 从 `src/db/schema-sqlite.ts` accounts 表删除 `totalCost` 字段
- [x] 1.2 从 `src/db/schema-pg.ts` accounts 表删除 `totalCost` 字段
- [x] 1.3 从 `src/lib/types.ts` Account 接口删除 `totalCost`，新增 `holdingsPnl: number`

## 2. API 层

- [x] 2.1 修改 `src/app/api/accounts/route.ts` GET：用 SQL 计算 holdingsPnl = Σ(marketValue - cost)，移除 totalCost 返回
- [x] 2.2 修改 `src/app/api/accounts/route.ts` POST：移除 totalCost 参数接收和写入
- [x] 2.3 修改 `src/app/api/accounts/[id]/route.ts` PUT：移除 totalCost 参数接收和更新
- [x] 2.4 修改 `src/app/api/transactions/route.ts`：移除 deposit/withdraw 交易中更新 totalCost 的副作用逻辑

## 3. 前端组件

- [x] 3.1 修改 `src/components/account-list.tsx` AccountForm：删除 totalCost state 和本金输入项
- [x] 3.2 修改 `src/components/account-list.tsx` 账户列表表头：删除"本金"列，"盈亏"改为"持仓盈亏"
- [x] 3.3 修改 `src/components/account-list.tsx` 账户行渲染：盈亏改用 `a.holdingsPnl` 展示，删除本金 td，调整 colSpan
- [x] 3.4 修改 `src/components/discipline-table.tsx`：表头"盈亏"改为"持仓盈亏"

## 4. 数据库同步

- [ ] 4.1 执行 `npx drizzle-kit push` 同步 schema 变更到数据库（需手动确认删除 total_cost 列）
