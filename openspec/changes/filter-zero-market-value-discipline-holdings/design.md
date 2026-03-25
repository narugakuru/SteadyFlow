## Context

当前 Dashboard 纪律表的数据由 `buildPortfolioSnapshot` 直接读取用户全部持仓后，在内存里换算 `marketValueCny`、排序，再通过 `filterVisibleDisciplineHoldings` 过滤零金额项。这个顺序导致两个问题：

1. `GET /api/asset-allocation` 的纪律明细数据源本身仍包含零市值持仓，只是返回前做了末端剔除。
2. 纪律排序弹窗复用了 `/api/holdings` 的全量持仓集合，因此零市值持仓仍会进入可排序列表；而 `/api/holdings/reorder` 又要求“该资产类别全部持仓”都必须提交，进一步把隐藏项绑进了纪律排序协议。

约束条件：

- 不影响账户页、批量更新页等需要展示全量持仓的接口。
- 需要兼容两种市值来源：`amount` 模式直接使用 `holdings.market_value`，`shares` 模式需要按 `shares * price` 判定是否为零值。
- 纪律总览排序仍要保持 `discipline_sort_order, id` 的稳定顺序。

## Goals / Non-Goals

**Goals:**

- 将纪律视图的零市值过滤前移到数据库检索阶段。
- 为资产配置纪律与纪律排序复用同一套“可见纪律持仓”查询口径。
- 让排序保存接口只校验当前可见、可排序的纪律持仓集合。

**Non-Goals:**

- 不修改 `holdings` 表结构，也不新增持久化字段。
- 不改变账户页、交易页、批量更新页的全量持仓读取行为。
- 不在本次变更里处理“极小非零值按阈值视为 0”之类的近零值规则。

## Decisions

### 决策 1：抽出纪律专用持仓查询服务，并在 SQL 条件里判定零市值

- 决策：新增纪律持仓查询服务，统一负责按用户、资产类别、`discipline_sort_order` 读取纪律可见持仓；查询条件使用 SQL `CASE` 兼容两种市值口径：
  - `shares` 模式：`shares * price <> 0`
  - 其他模式：`marketValue <> 0`
- 理由：这能从源头消除零市值持仓进入纪律链路，不再依赖后置过滤，也避免排序弹窗和 API 使用不同口径。
- 备选：继续读取全量持仓后在 TypeScript 中过滤。实现更快，但不能解决排序弹窗、导出与校验口径分裂的问题，因此不采用。

### 决策 2：纪律排序弹窗复用可见纪律持仓，而不是 `/api/holdings` 全量结果

- 决策：Dashboard 纪律表继续以 `/api/asset-allocation` 返回的类别明细作为展开数据源；排序弹窗所需 `Holding` 实体仍从 `/api/holdings` 补足编辑字段，但候选集合先由纪律可见持仓 ID 限定，只允许非零市值持仓进入排序。
- 理由：排序弹窗需要完整 `Holding` 字段驱动现有拖拽与交易/编辑逻辑，但“哪些持仓可排序”必须与纪律明细完全一致。
- 备选：新增独立 `/api/holdings/discipline` 接口直接返回完整行。这样也可行，但当前 `asset-allocation` 已经拥有纪律视图需要的明细集合；优先复用现有接口可减少一次额外请求与缓存键维护。

### 决策 3：排序保存接口校验范围改为“当前可见纪律持仓全集”

- 决策：`POST /api/holdings/reorder` 在 `scope=discipline` 时，不再要求提交当前资产类别下数据库中的全部持仓，而是要求提交纪律专用查询返回的全部可见持仓。
- 理由：如果前端不再展示零市值持仓，服务端继续要求这些隐藏项参与排序会形成协议冲突。
- 备选：允许部分提交、只更新传入项。这样会让未提交项的相对顺序不可预测，也不符合现有“提交全量排序结果”的约束，因此不采用。

## Risks / Trade-offs

- [Risk] `shares * price` 的 SQL 判定与持久化 `marketValue` 出现短暂不一致 -> Mitigation：纪律查询统一以业务真实口径优先；同时保持现有写入链路继续同步更新 `marketValue`，避免长期漂移。
- [Risk] 排序弹窗候选集合依赖 `allocation` 和 `holdings` 两份缓存 -> Mitigation：继续在保存后同时刷新 `asset-allocation` 与 `holdings`，并在组件内按 ID 求交集，保证结果收敛。
- [Risk] 旧的零值末位排序工具函数变成低价值代码 -> Mitigation：保留纯函数与测试用于兼容其他潜在调用链，但核心纪律查询不再依赖它实现隐藏逻辑。
