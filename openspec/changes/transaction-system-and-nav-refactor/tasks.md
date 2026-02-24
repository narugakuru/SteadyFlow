## 1. 数据库 Schema 变更

- [x] 1.1 accounts 表新增 totalCost (real, 默认0) 字段
- [x] 1.2 holdings 表新增 ticker (text, 可选)、valuationMode (text, 默认"amount")、shares (real, 默认0)、price (real, 默认0) 字段
- [x] 1.3 新增 transactions 表：id, accountId(FK), holdingId(FK可选), type, date, amount, shares, price, fee, affectBalance, note, createdAt
- [x] 1.4 更新 lib/types.ts 中的 Account、Holding 类型定义，新增 Transaction 类型
- [x] 1.5 运行 drizzle push 同步数据库，验证旧数据兼容

## 2. Transaction API

- [x] 2.1 新增 /api/transactions GET 路由：查询交易列表，支持 accountId 和 type 查询参数筛选，按 date 倒序
- [x] 2.2 新增 /api/transactions POST 路由：创建交易，实现副作用逻辑（buy/sell/dividend/deposit/withdraw 分别修改 holding/account 字段）
- [x] 2.3 POST 路由实现 affectBalance 开关逻辑：关闭时只创建记录不修改持仓/账户
- [x] 2.4 POST 路由实现卖出校验：amount 模式校验 marketValue>0，shares 模式校验卖出份额≤持有份额
- [x] 2.5 新增 /api/transactions/[id] DELETE 路由：只删除记录，不回滚持仓/账户数据

## 3. Holdings API 增强

- [x] 3.1 更新 /api/holdings POST 路由：支持 ticker、valuationMode、shares、price 字段
- [x] 3.2 更新 /api/holdings/[id] PUT 路由：支持编辑 ticker、valuationMode、shares、price；shares 模式下自动计算 marketValue = shares × price

## 4. Accounts API 增强

- [x] 4.1 更新 /api/accounts POST 路由：支持 totalCost 字段
- [x] 4.2 更新 /api/accounts/[id] PUT 路由：支持编辑 totalCost
- [x] 4.3 更新 /api/accounts GET 路由：返回 totalCost 字段
- [x] 4.4 删除账户时级联删除关联的交易记录

## 5. 全局导航栏

- [x] 5.1 创建 Navbar 组件：包含总览、账户、交易、快照、股价更新导航项，当前页面高亮，⚙️配置按钮触发弹窗
- [x] 5.2 重构 layout.tsx：引入 Navbar 组件，所有页面共享导航栏
- [x] 5.3 将 AssetClassSettings 配置弹窗的状态管理提升到 layout 或 Navbar 层级

## 6. 总览页重构 (/)

- [x] 6.1 从 page.tsx 移除 AccountList 组件引用和 selectedAccount 相关逻辑
- [x] 6.2 移除 header 区域的批量更新、快照历史等导航按钮（已在全局导航栏中）
- [x] 6.3 保留：总资产卡片、PortfolioChart、DisciplineTable、DeviationChart、RebalancePanel

## 7. 账户页面 (/accounts)

- [x] 7.1 创建 /accounts/page.tsx：迁移 AccountList 和 HoldingsPanel 组件
- [x] 7.2 增强 AccountList 组件：显示 totalCost、盈亏字段
- [x] 7.3 增强 HoldingsPanel 组件：持仓表单支持 ticker、valuationMode 选择
- [x] 7.4 HoldingsPanel 中 shares 模式持仓显示份额、股价，市值自动计算
- [x] 7.5 HoldingsPanel 中 amount 模式持仓保持现有的手动编辑 cost/marketValue

## 8. 交易页面 (/transactions)

- [x] 8.1 创建 /transactions/page.tsx：交易记录列表页面
- [x] 8.2 实现交易筛选：按账户下拉、按交易类型下拉
- [x] 8.3 实现交易列表：按时间倒序，显示类型、账户、持仓、金额、股数、手续费、日期，每条只有删除按钮
- [x] 8.4 实现新增交易 Dialog：选择交易类型后动态显示表单字段
- [x] 8.5 交易表单：deposit/withdraw 只选账户+金额；buy/sell 选账户→选持仓→根据 valuationMode 显示字段；dividend 选账户+可选持仓+金额
- [x] 8.6 交易表单：affectBalance 开关（默认开启）、自定义交易日期、备注
- [x] 8.7 实现删除交易确认弹窗
