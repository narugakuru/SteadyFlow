## Why

目前使用 Excel 管理个人投资组合，存在以下痛点：资金分散在国内外多个平台（A股券商、美股券商、港股券商、银行、支付宝等），仓位管理困难；无法直观地对比资产配置目标与实际占比；缺乏交易纪律的量化提醒机制。需要一个轻量级的个人资产组合管理工具，帮助执行纪律化的资产配置策略。

## What Changes

- 新建完整的 Web 应用项目（Next.js + SQLite）
- 实现多账户管理：支持不同币种（CNY/USD/HKD）的账户，每个账户设置总额，现金自动计算（总额 - 持仓市值之和）
- 实现持仓管理：在账户下添加持仓，每个持仓标记所属资产类别（股票基金/黄金/债券），市值手动更新
- 实现资产类别配置：四大类（股票基金、黄金、债券、现金），设置目标占比和偏离阈值
- 实现 Dashboard：总资产概览、配置纪律表（目标/实际/偏离/状态）、账户视角、资产类别视角
- 实现汇率自动获取与缓存（USD/CNY、HKD/CNY）
- 实现每日快照机制，记录资产历史状态用于未来图表可视化

## Capabilities

### New Capabilities
- `account-management`: 多账户 CRUD，支持多币种，账户总额管理，现金自动计算
- `holding-management`: 持仓 CRUD，关联账户与资产类别，市值手动更新
- `asset-allocation`: 资产类别配置（目标占比、偏离阈值），实际占比计算，纪律偏离警告
- `dashboard`: 总资产概览，配置纪律表，账户视角与资产类别视角的双维度展示
- `exchange-rate`: 自动获取并缓存外汇汇率，支持 USD/CNY、HKD/CNY
- `daily-snapshot`: 每日资产快照记录，存储历史配置数据用于未来趋势分析

### Modified Capabilities

（无，全新项目）

## Impact

- 新建 Next.js 项目，包含前后端代码
- 引入 SQLite 作为本地数据库（better-sqlite3 或 Drizzle ORM）
- 引入外部汇率 API 依赖（如 exchangerate-api.com 免费接口）
- 后期可迁移至 Electron（桌面应用）或 Vercel + Supabase（云端部署）
