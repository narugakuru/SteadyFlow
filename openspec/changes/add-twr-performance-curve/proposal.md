## Why

总览页当前以"净值曲线"（每日总资产 `totalAssetCny`）替代收益率曲线。净值曲线无法回答"我真正赚了多少"，因为总资产的变化里混入了资金的转入转出——新转入的钱会被误读为收益。

系统已经具备计算真实收益率所需的两块原料：

- 每日净值快照（`netvalue.totalAssetCny`）提供逐日组合市值 `V_t`，无需抓取历史行情即可反推任意历史日的市值。这一点优于纯交易流水架构（如 Wealthfolio 需抓全历史股价反推市值），对银行存款、支付宝余额等"类现金资产"也天然适用。
- `transactions` 表的 `deposit / withdraw` 记录提供外部现金流。

缺的只是把两者对齐、用时间加权收益率（TWR）公式剔除现金流影响这一步计算逻辑。本变更补上这一步，并提供"补录历史现金流后整条收益率链路自动重算"的效果（类似 Wealthfolio），但不依赖历史行情、不新增重型重算管线。

## What Changes

- 新增 TWR（时间加权收益率）计算能力：以每日净值快照为市值序列、以 `deposit/withdraw` 聚合为外部现金流，逐日链式累乘得到累计收益率曲线。
- 新增收益率业绩读模型与端点 `GET /api/netvalue/performance`，按 `range`/`grain` 返回累计 TWR 序列与区间业绩摘要（累计 TWR、年化 TWR）。
- 收益率计算采用"实时聚合"：每次请求即时从 `transactions` 聚合现金流并与净值序列对齐，因此补录或修改历史现金流后曲线自动反映最新结果，无需独立重算任务。
- 外部现金流分类明确：仅 `deposit`（流入，正）与 `withdraw`（流出，负）计为外部现金流；`buy/sell/dividend/fee/interest` 等为内部流，由市值快照自然吸收，不参与现金流剔除。
- 新增可选的"业绩起算日"用户设置 `performance.start_date`，用于跳过早期建仓期或数据不完整区段；默认取该用户最早一条净值快照日期。
- 总览页/净值页在净值曲线之外，新增可切换的"收益率曲线"视图，使用 0% 基准线展示累计 TWR。
- 不引入 Excel 历史导入（不符合使用场景）；不新增数据库列（现阶段实时聚合，避免 schema 迁移与重算管线）。

## Capabilities

### New Capabilities

- `performance-return-curve`: 基于每日净值快照与交易现金流计算时间加权收益率（TWR）曲线与业绩摘要，支持业绩起算日与补录现金流后自动重算。

### Modified Capabilities

- `daily-netvalue`: 净值快照成为收益率计算的市值序列来源，明确其作为业绩计算输入的语义。
- `visualization-charts`: 在资产面积图之外新增累计 TWR 收益率曲线视图，区分"资产价值趋势"与"投资业绩曲线"。
- `transaction-management`: `deposit/withdraw` 被定义为收益率计算的外部现金流来源，明确其对业绩链路的影响。

## Impact

- 新增收益率业绩服务（TWR 计算 + 现金流聚合 + 与净值序列对齐）。
- 新增 `GET /api/netvalue/performance` 端点。
- 新增 `performance.start_date` 设置读写。
- 总览页/净值页新增收益率曲线视图与净值/收益率切换交互。
- 客户端缓存策略新增 `netvalue-performance` 查询键及写操作失效映射。
- 共享 TypeScript 业绩数据类型。
- OpenSpec 主规格与 `project_overview.md` / `openspec/project.md` 同步。

## Non-goals

- 不抓取或存储历史行情数据，不反推上线前的逐日证券市值。
- 不实现资金加权收益率（MWR/XIRR）；本期仅交付 TWR（XIRR 列为后续可选增强）。
- 不实现 Excel 历史数据导入。
- 不新增数据库列或预计算快照表；不引入后台重算队列。
