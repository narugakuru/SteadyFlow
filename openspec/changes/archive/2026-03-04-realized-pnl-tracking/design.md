## Context

当前系统的收益展示以持仓浮动盈亏为主，卖出交易不会沉淀“已实现收益”。交易写入路径已包含较多副作用（持仓、现金、净值触发），若继续在读路径按交易全量回放计算了结盈亏，会随着数据量增长带来复杂度和性能压力。

本次变更需要同时满足：

- 了结盈亏可长期累积，新增/删除交易时增量维护；
- 不破坏现有“删除交易不回滚持仓/现金”的操作认知；
- 事务化保证交易、台账、账户汇总不会出现部分成功；
- 字段命名不绑定 CNY，为未来“本位币可切换”预留。

## Goals / Non-Goals

**Goals:**

- 在交易维度保存每笔卖出的了结盈亏（账户原币种）。
- 在账户维度保存累计了结盈亏，并在交易新增/删除时 O(1) 增量更新。
- 统一规则：仅 `sell + affectHolding=true` 计入了结盈亏，手续费计入；`affectHolding=false` 不计入。
- Dashboard 在总资产区域展示三项指标：账户总盈亏、持仓盈亏、了结盈亏，其中账户总盈亏实时计算，不单独存储。
- 新增/删除交易改为事务执行。

**Non-Goals:**

- 不做历史交易了结盈亏反推回填（老数据统一从 0 起算）。
- 不实现“按交易日汇率还原了结盈亏”。
- 不在本次引入新的本位币切换 UI/设置能力（仅做命名与数据结构预留）。

## Decisions

### 1) 双层存储：交易明细 + 账户累计

**Decision**

- 在 `transactions` 增加 `realizedPnl`（账户原币种，默认 0）。
- 在 `accounts` 增加 `realizedPnl`（账户原币种，默认 0，累计值）。

**Rationale**

- 明细层用于审计与删除反向扣减；
- 账户层用于高频读取，避免每次汇总扫描交易表。

**Alternatives considered**

- 仅存交易明细、查询时 sum：读放大明显，不适合长期增长。
- 仅存账户累计：缺失明细来源，删除交易难以精确反向更新。

### 2) 了结盈亏计算口径

**Decision**

- 仅当 `type=sell && affectHolding=true` 计算 `realizedPnl`，其他交易为 0。
- 手续费计入了结盈亏（净收益口径）。
- `affectHolding=false` 的卖出新增/删除都不影响了结盈亏。

**Rationale**

- 与用户认知一致：只有真实减仓才产生“了结”。
- 口径对称，新增与删除行为可逆。

**Alternatives considered**

- 只要是 sell 都计入：会把“仅记账卖出”误计为已实现收益。
- 手续费不计入：与“实际赚了多少”认知不符。

### 3) 写路径事务化

**Decision**

- `POST /api/transactions` 与 `DELETE /api/transactions/:id` 统一使用数据库事务。
- 事务内同时处理：交易记录、持仓/现金副作用、账户累计了结盈亏更新。

**Rationale**

- 防止出现“交易写入成功但累计盈亏未更新”或反向场景。

**Alternatives considered**

- 保持当前多语句非事务：故障时会出现账不一致。

### 4) Dashboard 收益拆解来源

**Decision**

- 在资产聚合读接口中返回：
  - `realizedPnl`（折算到当前展示币种，当前阶段为 CNY 展示）
  - `unrealizedPnl`（现有持仓盈亏汇总）
  - `totalPnl = realizedPnl + unrealizedPnl`（实时计算）
- 字段命名不附带 `Cny` 后缀。

**Rationale**

- 与未来本位币切换兼容，避免后续大规模重命名。

**Alternatives considered**

- 继续使用 `*Cny` 命名：短期可用，但会增加未来多币种改造成本。

## Risks / Trade-offs

- [历史数据从 0 起算导致“总了结盈亏”断点] → 在变更说明与 UI 提示中明确“自启用后累计”。
- [删除交易仍不回滚持仓/现金，用户可能误解为“全量回退”] → 保留删除确认文案，并补充“仅回退了结盈亏累计，不回滚持仓/现金”。
- [双数据库迁移差异风险] → SQLite/PG 同步增加字段与默认值，并在验收中覆盖两种 DB_TYPE。
- [将来引入本位币后汇率口径变化] → 当前实现保持“展示时按当前汇率折算”，并把交易明细保留原币种，减少迁移成本。

## Migration Plan

1. 为 `transactions`、`accounts` 增加 `realizedPnl` 字段，默认 0。
2. 执行双数据库迁移（SQLite + PostgreSQL）。
3. 发布后老交易自动保持 `realizedPnl=0`，新交易按新规则累计。
4. 校验关键链路：
   - 新增卖出（`affectHolding=true`）会增加账户累计；
   - 新增卖出（`affectHolding=false`）不变；
   - 删除上述两类交易时分别对称扣减/不变；
   - 持仓/现金“删除不回滚”行为保持原样。

## Open Questions

- 是否在 Dashboard 上增加“累计起始时间（自启用后）”提示，以降低老数据从 0 起算的理解成本。
