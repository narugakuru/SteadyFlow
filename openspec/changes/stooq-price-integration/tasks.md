## 1. Stooq 数据获取层

- [ ] 1.1 新建 `src/lib/stooq.ts`，实现 `fetchStooqQuote(symbol)` 单个符号获取函数（HTTP fetch → CSV 解析 → 返回数据对象或 null）
- [ ] 1.2 在 `src/lib/stooq.ts` 中实现 `fetchStooqQuotes(symbols[])` 批量获取函数（逐个请求，收集结果）

## 2. 市场指数数据源替换

- [ ] 2.1 重写 `src/lib/market-config.ts`：`yahoo` 字段改为 `stooq`，不支持的指数 stooq 设为 `null`，更新 6 个有数据的指数符号映射
- [ ] 2.2 重写 `src/lib/market-data.ts`：移除 yahoo-finance2 引用，改用 `stooq.ts` 的函数获取指数数据，stooq 为 null 的指数返回空价格
- [ ] 2.3 移除 `yahoo-finance2` npm 依赖（`npm uninstall yahoo-finance2`）

## 3. cost 字段语义变更与数据迁移

- [ ] 3.1 编写数据迁移脚本：`UPDATE holdings SET cost = cost / shares WHERE shares > 0 AND valuationMode = 'shares'`（支持 SQLite 和 PG）
- [ ] 3.2 在 `src/lib/market-data.ts`、`src/lib/types.ts` 等关键文件中添加 cost 字段语义注释（shares 模式=平均每股成本，amount 模式=总成本）

## 4. 交易副作用逻辑调整

- [ ] 4.1 修改 `POST /api/transactions` 中 shares 模式买入逻辑：cost 按加权平均法重算 `(oldCost × oldShares + txPrice × txShares) / newShares`，price = txPrice，marketValue = newShares × newPrice
- [ ] 4.2 修改 `POST /api/transactions` 中 shares 模式卖出逻辑：cost 不变，shares -= txShares，price = txPrice，marketValue = newShares × newPrice

## 5. 盈亏计算公式适配

- [ ] 5.1 修改 `HoldingRow` 组件：shares 模式盈亏 = marketValue - (cost × shares)，amount 模式不变
- [ ] 5.2 修改 `asset-allocation` API：shares 模式总成本 = cost × shares，盈亏 = marketValue - 总成本
- [ ] 5.3 检查并修改其他引用 cost 计算盈亏的位置（discipline-table、account-list 等）

## 6. 持仓自动报价 API

- [ ] 6.1 新建 `src/app/api/holdings/fetch-prices/route.ts`：查询当前用户 shares 模式持仓，筛选 ticker 匹配 `*.us` / `*.jp`，调用 Stooq 拉取价格，更新 price 和 marketValue，返回 updated/failed/skipped 结果

## 7. 编辑持仓对话框增强

- [ ] 7.1 修改 `HoldingEditDialog`：shares 模式新增成本价（cost）输入框，允许手动修正
- [ ] 7.2 修改 `HoldingEditDialog`：shares 模式新增现价（price）独立修正入口，修改后联动更新 marketValue
- [ ] 7.3 修改 `PUT /api/holdings/[id]`：支持接收并更新 cost 字段

## 8. 新建持仓表单 ticker 提示

- [ ] 8.1 修改新建持仓表单（account-list 内联新建 + TransactionForm 内联新建）：ticker 输入框添加 placeholder `aapl.us / 7203.jp` 和帮助文本

## 9. 自动报价按钮（前端）

- [ ] 9.1 修改 Dashboard 页面（`src/app/page.tsx`）：在记录净值按钮左边新增「自动获取报价」按钮，调用 `POST /api/holdings/fetch-prices`，显示加载状态和 toast 结果摘要，完成后刷新数据
- [ ] 9.2 修改 batch-update 页面（`src/app/batch-update/page.tsx`）：顶部新增「自动获取报价」按钮，功能同上

## 10. 持仓展示文案调整

- [ ] 10.1 修改 `HoldingRow`：第二行 shares 模式从"均价"改为"成本价"，确认"股价"改为"现价"
