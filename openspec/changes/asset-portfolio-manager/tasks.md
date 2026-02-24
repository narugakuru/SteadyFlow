## 1. 项目初始化

- [ ] 1.1 初始化 Next.js 项目（App Router, TypeScript, Tailwind CSS）
- [ ] 1.2 安装依赖：better-sqlite3, drizzle-orm, drizzle-kit, shadcn/ui
- [ ] 1.3 配置 Drizzle ORM 连接 SQLite，创建 db 初始化逻辑
- [ ] 1.4 初始化 shadcn/ui 组件库，安装基础组件（Button, Card, Table, Dialog, Tabs, Input, Badge）

## 2. 数据库 Schema

- [ ] 2.1 创建 accounts 表（id, name, currency, total_balance, created_at, updated_at）
- [ ] 2.2 创建 holdings 表（id, account_id, name, market_value, asset_class, created_at, updated_at）
- [ ] 2.3 创建 asset_classes 表（id, name, target_pct, warning_threshold, danger_threshold）并预置四条记录（股票基金/黄金/债券/现金）
- [ ] 2.4 创建 exchange_rates 表（id, currency_pair, rate, updated_at）
- [ ] 2.5 创建 snapshots 表（id, date, total_asset_cny, data_json, created_at）
- [ ] 2.6 运行 drizzle-kit 生成迁移并验证数据库初始化

## 3. 汇率服务

- [ ] 3.1 实现汇率 API 调用（exchangerate-api.com），获取 USD/CNY 和 HKD/CNY
- [ ] 3.2 实现汇率缓存逻辑：每日首次请求后缓存到 exchange_rates 表，当天不重复请求
- [ ] 3.3 实现降级逻辑：API 不可用时使用最近缓存，无缓存时使用默认汇率
- [ ] 3.4 创建 API Route: GET /api/exchange-rates 返回当前汇率及更新时间

## 4. 账户管理

- [ ] 4.1 创建 API Route: POST /api/accounts 创建账户
- [ ] 4.2 创建 API Route: GET /api/accounts 获取账户列表（含现金自动计算）
- [ ] 4.3 创建 API Route: PUT /api/accounts/[id] 编辑账户
- [ ] 4.4 创建 API Route: DELETE /api/accounts/[id] 删除账户（级联删除持仓）
- [ ] 4.5 实现账户管理 UI：账户列表、创建/编辑对话框、删除确认

## 5. 持仓管理

- [ ] 5.1 创建 API Route: POST /api/holdings 添加持仓
- [ ] 5.2 创建 API Route: PUT /api/holdings/[id] 编辑持仓
- [ ] 5.3 创建 API Route: DELETE /api/holdings/[id] 删除持仓
- [ ] 5.4 实现持仓管理 UI：在账户下展示持仓列表、添加/编辑/删除持仓

## 6. 资产配置与纪律

- [ ] 6.1 创建 API Route: GET /api/asset-allocation 获取资产配置数据（目标/实际/偏离/状态）
- [ ] 6.2 创建 API Route: PUT /api/asset-classes 更新目标占比和偏离阈值
- [ ] 6.3 实现占比计算逻辑：按资产类别汇总持仓市值(CNY)，计算实际占比和偏离度
- [ ] 6.4 实现警告状态判定：根据偏离度与阈值对比，返回正常/警告/危险状态
- [ ] 6.5 实现资产配置设置 UI：目标占比编辑（总和校验 100%）、阈值编辑

## 7. Dashboard

- [ ] 7.1 实现 Dashboard 页面布局：总资产卡片 + 配置纪律表 + 视角切换区域
- [ ] 7.2 实现配置纪律表组件：表格展示四个类别的目标/实际/偏离/状态，带颜色标识
- [ ] 7.3 实现账户视角：账户列表，展开显示持仓（标注资产类别）和现金余额
- [ ] 7.4 实现资产类别视角：类别列表，展开显示标的（标注所属账户和占总资产比例）
- [ ] 7.5 实现汇率状态显示：底部显示当前汇率和最后更新时间

## 8. 每日快照

- [ ] 8.1 创建 API Route: POST /api/snapshots 创建/更新当日快照
- [ ] 8.2 创建 API Route: GET /api/snapshots 获取快照历史列表
- [ ] 8.3 实现自动快照逻辑：应用加载时检查当天是否已有快照，无则自动创建
- [ ] 8.4 实现手动刷新快照按钮
- [ ] 8.5 实现快照历史页面：按日期倒序展示，显示总资产和各类别占比
