## Why

当前系统只展示持仓浮动盈亏，缺少“了结盈亏”这条投资闭环主线，用户无法直观看到已兑现收益。随着交易记录增长，若每次页面读取时全量重算，复杂度和维护成本都会持续上升，因此需要把了结盈亏做成可增量维护的数据能力。

## What Changes

- 新增“了结盈亏台账”能力：在交易维度保存卖出交易的了结盈亏，并在账户维度维护累计了结盈亏。
- 新增交易创建/删除的增量更新规则：仅 `sell + affectHolding=true` 参与了结盈亏；创建时增加、删除时减少；两者都通过事务保证原子性。
- 历史交易初始化策略：老数据的 `realizedPnl` 默认 `0`，不做历史反推回填。
- Dashboard 总资产区增加三项收益拆解展示：账户总盈亏（实时计算）、持仓盈亏、了结盈亏。
- 命名为中性金额字段，避免绑定到 `CNY` 后缀，为后续“可切换本位币”预留空间。

## Capabilities

### New Capabilities

- `realized-pnl-ledger`: 定义卖出交易了结盈亏的存储、账户累计规则、删除回退规则与事务一致性约束。

### Modified Capabilities

- `transaction-management`: 补充卖出交易了结盈亏计算规则、`affectHolding=false` 排除规则、删除交易时对累计了结盈亏的反向更新规则。
- `dashboard`: 扩展总资产卡片展示，新增账户总盈亏/持仓盈亏/了结盈亏三项指标。

## Impact

- 数据模型：`transactions`、`accounts` 增加了结盈亏相关字段（双数据库方言与迁移同步变更）。
- 交易 API：`POST /api/transactions`、`DELETE /api/transactions/:id` 新增了结盈亏增量逻辑并升级为事务执行。
- 资产聚合 API：`GET /api/asset-allocation` 返回 Dashboard 所需的收益拆解字段。
- 前端页面：`src/app/page.tsx` 总资产区域布局与字段展示更新。
