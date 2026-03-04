## 1. 交易弹窗交互修复

- [x] 1.1 调整 `transaction-form` 初始化逻辑，确保弹窗打开后切换类型不清空已选账户与持仓
- [x] 1.2 实现买入/卖出选择持仓后的价格自动填充，并保留用户手动覆盖能力
- [x] 1.3 回归验证账户切换仍会清空持仓，避免跨账户误关联

## 2. 了结盈亏口径修正

- [x] 2.1 在交易创建接口中新增股息 `realizedPnl` 计算规则（`affectCash=true` 时 `amount-fee`）
- [x] 2.2 将股息交易 `realizedPnl` 增量计入账户累计 `realizedPnl`（SQLite 与 PostgreSQL 路径一致）
- [x] 2.3 验证删除交易时现有回退逻辑可对股息交易正确生效

## 3. 规格与项目文档同步

- [x] 3.1 更新 `openspec/specs/transaction-management/spec.md`，补充弹窗交互与股息了结盈亏规则
- [x] 3.2 更新 `openspec/specs/realized-pnl-ledger/spec.md`，补充股息存储与增量维护场景
- [x] 3.3 更新 `project_overview.md` 进展日志并记录影响范围
