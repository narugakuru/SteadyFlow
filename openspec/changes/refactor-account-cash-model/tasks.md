## 1. 数据库迁移

- [x] 1.1 执行 SQL 迁移：`ALTER TABLE accounts RENAME COLUMN total_balance TO cash_balance`
- [x] 1.2 更新 `src/db/schema.ts`：将 `totalBalance` 字段改为 `cashBalance`，映射到 `cash_balance` 列

## 2. 类型定义更新

- [x] 2.1 更新 `src/lib/types.ts`：Account 接口中 `totalBalance` → `cashBalance`，移除 `cash` 字段，新增计算字段 `accountValue`（cashBalance + holdingsValue）

## 3. 账户 API 重构

- [x] 3.1 更新 `src/app/api/accounts/route.ts` GET：查询返回 `cashBalance`，计算 `accountValue = cashBalance + holdingsValue`
- [x] 3.2 更新 `src/app/api/accounts/route.ts` POST：创建账户接收 `cashBalance`，`totalCost` 默认等于 `cashBalance`
- [x] 3.3 更新 `src/app/api/accounts/[id]/route.ts` PUT：编辑账户使用 `cashBalance` 字段

## 4. 交易 API 重构

- [x] 4.1 更新 `src/app/api/transactions/route.ts`：所有交易副作用中 `totalBalance` → `cashBalance`（买入/卖出/股息/存入/取出）

## 5. 资产配置 API 重构

- [x] 5.1 更新 `src/app/api/asset-allocation/route.ts`：总资产计算改为 `Σ(cashBalance + holdingsValue)` 的 CNY 折算，现金直接用 `cashBalance`

## 6. 快照 API 重构

- [x] 6.1 更新 `src/app/api/snapshots/route.ts`：快照中账户 totalCny 改用 `cashBalance + holdingsValue`，cashCny 用 `cashBalance`

## 7. 批量更新页面重构

- [x] 7.1 更新 `src/app/batch-update/page.tsx`：移除账户总额编辑功能，只保留持仓市值/股价编辑，账户行显示只读的总价值和现金
- [x] 7.2 更新批量更新 API（如有）：移除账户 totalBalance 更新逻辑

## 8. 前端组件更新

- [x] 8.1 更新 `src/components/account-list.tsx`：AccountForm 改为填写 cashBalance（标签"初始现金/现金余额"），市值列显示 accountValue，现金列显示 cashBalance，盈亏改为 accountValue - totalCost
- [x] 8.2 更新 `src/components/account-list.tsx` 展开区域：总额显示 accountValue，现金显示 cashBalance
- [x] 8.3 检查并更新 `src/components/asset-class-view.tsx` 中的现金计算逻辑
- [x] 8.4 检查并更新其他引用 totalBalance 的组件（holdings-panel.tsx 等）

## 9. 验证与清理

- [x] 9.1 全局搜索确认无残留的 `totalBalance` / `total_balance` 引用
- [x] 9.2 构建验证通过，无编译错误
