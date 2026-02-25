## Why

当前系统只能通过手动编辑持仓的本金/市值来管理资产变动，没有买入卖出等操作记录，无法追溯历史操作。同时所有功能挤在单页面中，账户列表与总览混杂，页面拥挤。需要引入交易记录系统并重构为多页导航结构。

## What Changes

- 新增交易记录（Transaction）系统：支持买入、卖出、股息、现金存入、现金取出五种交易类型
- 持仓新增双估值模式：amount 模式（基金等，手动更新市值）和 shares 模式（股票/ETF，股价×份额自动算市值）
- 持仓新增 ticker（股票代码）字段，为后续自动查询股价做准备
- 账户新增 totalCost（本金）字段，支持账户级别盈亏计算
- **BREAKING**: 页面结构从单页重构为多页导航：总览、账户、交易、快照、股价更新
- 新增全局顶部导航栏
- 总览页移除账户列表，只保留图表和纪律表
- 账户管理独立为 /accounts 页面
- 新增 /transactions 交易记录页面

## Capabilities

### New Capabilities
- `transaction-management`: 交易记录的创建、删除、列表展示、筛选，以及交易创建时对持仓/账户的副作用逻辑
- `navigation-layout`: 全局顶部导航栏，多页路由结构

### Modified Capabilities
- `holding-management`: 新增 ticker、valuationMode、shares、price 字段；shares 模式下市值自动计算；手动编辑与交易记录两种修改路径共存
- `account-management`: 新增 totalCost 字段；账户级别盈亏计算；手动编辑本金/市值保留
- `dashboard`: 移除账户列表，只保留总览内容（总资产、图表、纪律表、再平衡建议）

## Impact

- 数据库 schema 变更：accounts 表加字段、holdings 表加字段、新增 transactions 表
- 需要数据库迁移脚本处理已有数据（新字段给默认值，旧持仓默认 amount 模式）
- 新增 API 路由：/api/transactions（CRUD + 副作用逻辑）
- 重构 layout.tsx 加入全局导航栏
- 新增页面：/accounts/page.tsx、/transactions/page.tsx
- 重构主页 page.tsx 移除账户列表
- 现有组件 account-list.tsx、holdings-panel.tsx 需要迁移到 /accounts 页面并增强
