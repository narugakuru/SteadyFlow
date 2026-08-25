## Context

交易系统当前把每条记录绑定到单个账户，并通过 `cashDelta`、`principalDelta` 支持删除回滚。账户互转同时影响两个账户，且不能被 TWR 当作外部入金/出金，因此需要成组记录与原子写入。项目同时支持 SQLite 事务和 Neon PostgreSQL `db.batch` 原子批处理。

## Goals / Non-Goals

**Goals:**

- 一次请求完成两个当前用户账户之间的资金及 principal 迁移。
- 同币种提供简洁输入，跨币种准确记录实际转出和到账金额。
- 用关联交易记录保持交易流水可见，并支持从任一侧整体删除回滚。
- 复用现有缓存失效、净值刷新和双数据库部署迁移机制。

**Non-Goals:**

- 不提供自动换汇报价、手续费拆分或跨用户转账。
- 不支持编辑既有互转；仍采用删除后重新创建。
- 不允许关闭现金或 principal 副作用，互转始终实际记账。

## Decisions

### 使用一对交易记录表达一次互转

交易表新增 `transferGroupId` 与 `counterpartyAccountId`，交易类型增加 `transfer_out`、`transfer_in`。两条记录共享 UUID 组标识，各自存储所属账户币种下的金额、`cashDelta` 和 `principalDelta`。该方案让现有按账户筛选和交易列表自然展示两侧流水，也能沿用 delta 回滚模型。相比只存一条双账户记录，它不会破坏 `transactions.accountId` 的既有归属语义。

### 使用独立创建接口并扩展现有删除接口

`POST /api/transfers` 负责专用校验与原子创建；`DELETE /api/transactions/:id` 检测 `transferGroupId` 后查询并回滚整组。来源与目标必须不同且均属于当前用户，金额必须为正。同币种时后端强制到账金额等于转出金额，避免前端篡改；跨币种接受用户填写的实际到账金额。

### principal 与现金使用相同方向的账户本币 delta

来源账户的 `cashBalance` 和 `principal` 减少转出金额，目标账户两者增加到账金额。这样内部调拨不会凭空改变各账户相对其原始资金的累计盈亏口径。跨币种因实际兑换导致的组合折算差异由实际到账结果体现，不额外计入 realizedPnl。

### 互转不参与 TWR 外部现金流

现有收益率服务只读取 `deposit` 和 `withdraw`。新类型保持为内部流，不复用这两个类型，避免成对现金流在日期或汇率折算中产生错误外部流影响。

### 双数据库采用现有原子写入约定

SQLite 使用 `db.transaction`；Neon HTTP PostgreSQL 使用单个 `db.batch`。创建操作包含两条账户更新和两条交易插入；删除操作包含两条账户回滚与整组交易删除。Drizzle 同时生成 SQLite 和 PostgreSQL 迁移，并由现有 build migration 脚本执行 PostgreSQL 部署迁移。

## Risks / Trade-offs

- [删除任一记录会删除两条流水，可能超出用户直觉] -> 删除确认文案明确说明将整体回滚互转。
- [删除账户时级联删除一侧记录可能留下另一侧记录] -> 账户删除接口在删账户前识别相关互转组并整体删除相关交易；账户级数据删除仍需保持外键一致。
- [跨币种填写错误到账金额会造成估值偏差] -> 表单同时展示两侧币种并要求正数，提交前显示明确的转出/到账摘要。
- [历史行没有关联字段] -> 新字段可空，不影响既有交易与删除逻辑。

## Migration Plan

1. 为 SQLite/PostgreSQL 交易表添加可空 `transfer_group_id`、`counterparty_account_id` 和组标识索引。
2. 部署兼容新字段的 API 与 UI；历史记录无需回填。
3. 回滚应用版本时新列可保留，旧代码会忽略新字段；如需彻底回滚，可在确认无互转记录后移除列。

## Open Questions

无。自动汇率与手续费明细留待后续独立变更。
