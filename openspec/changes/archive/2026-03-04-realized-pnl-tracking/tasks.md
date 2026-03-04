## 1. 数据模型与迁移

- [x] 1.1 在 SQLite/PG schema 中为 `transactions` 新增 `realizedPnl` 字段（默认 0，原币种）
- [x] 1.2 在 SQLite/PG schema 中为 `accounts` 新增累计 `realizedPnl` 字段（默认 0，原币种）
- [x] 1.3 生成并执行双数据库迁移，确认历史数据默认值生效且不做回填

## 2. 交易写路径事务化

- [x] 2.1 将 `POST /api/transactions` 改为事务执行，纳入交易写入、持仓/现金副作用与账户累计更新
- [x] 2.2 将 `DELETE /api/transactions/:id` 改为事务执行，纳入交易删除与账户累计对称扣减
- [x] 2.3 保持现有行为：删除交易不回滚持仓与现金，只回退累计了结盈亏

## 3. 了结盈亏计算与增量规则

- [x] 3.1 在交易创建时实现 `sell + affectHolding=true` 的 `realizedPnl` 计算并落库
- [x] 3.2 将手续费计入 `realizedPnl` 计算口径
- [x] 3.3 实现 `affectHolding=false` 的卖出交易新增/删除均不影响累计了结盈亏

## 4. 聚合接口与类型

- [x] 4.1 扩展资产聚合接口返回 `realizedPnl`、`unrealizedPnl`、`totalPnl`（命名不带 CNY 后缀）
- [x] 4.2 更新前端类型定义，确保 Dashboard 可直接消费收益拆解字段
- [x] 4.3 确认展示换算沿用当前汇率口径（当前阶段展示为 CNY）

## 5. Dashboard 展示改造

- [x] 5.1 调整总资产卡片布局，利用右侧区域展示三项收益拆解
- [x] 5.2 新增账户总盈亏实时计算展示（`持仓盈亏 + 了结盈亏`）
- [x] 5.3 完成移动端纵向堆叠适配，避免指标裁切或重叠

## 6. 验证与文档同步

- [x] 6.1 补充/更新交易与 Dashboard 相关测试用例（含事务回滚与新增/删除对称性）
- [x] 6.2 手工验证核心场景：计入/不计入了结盈亏、删除交易回退累计值、老交易默认 0
- [x] 6.3 更新 `project_overview.md` 进展日志，并同步主 `openspec/specs` 的功能变动说明（按流程在归档或同步阶段完成）
