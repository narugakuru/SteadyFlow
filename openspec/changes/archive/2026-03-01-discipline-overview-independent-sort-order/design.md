## Context

当前持仓排序字段仅表达“账户内排序”，并被纪律总览复用。该复用在同一资产类别包含多个账户标的时会产生不可控排序，无法满足“总览视角按资产类别统一管理顺序”的需求。  
同时，纪律表排序入口目前视觉权重偏高，不符合低频功能的交互预期。

该改动会同时影响数据模型、持仓读取/写入 API、纪律表交互组件，属于跨模块变更，且需要兼容历史数据。

## Goals / Non-Goals

**Goals:**

- 为纪律总览建立独立排序能力，排序粒度为“账户 + 资产类别内持仓顺序”。
- 保持账户页现有排序语义不变，避免已有账户管理流程回归。
- 将纪律表排序入口改为低干扰小图标，并固定在“状态”列后右对齐。
- 提供历史数据回填与稳定排序兜底，确保上线后顺序可预测。

**Non-Goals:**

- 不改造账户页排序交互与账户内排序字段定义。
- 不实现跨用户共享排序模板。
- 不实现多人并发拖拽排序冲突自动合并。

## Decisions

### 1) 增加纪律总览专用排序字段

- 决策：将账户页排序字段重命名为 `account_sort_order`（由 `sort_order` 迁移而来），并在 `holdings` 增加独立字段 `discipline_sort_order` 用于纪律总览排序。
- 原因：避免排序语义混用，查询简单且易于与现有数据模型兼容。
- 备选：单独建映射表（`discipline_holding_orders`）可扩展但复杂度更高，当前不采用。

### 2) 纪律总览读取使用独立排序键

- 决策：纪律表持仓查询统一按 `discipline_sort_order ASC, id ASC` 返回；账户页保持 `account_sort_order ASC, id ASC`。
- 原因：实现双视图排序解耦，降低行为歧义。
- 备选：前端按本地规则重排；会导致多端不一致且刷新后不可复现。

### 3) 排序写入采用专用重排接口

- 决策：新增纪律总览排序更新入口（可为现有 holdings reorder 接口扩展 mode，也可新增专用 route），要求 payload 包含 `assetClass` 与 `id/sortOrder` 列表，服务端校验用户归属与资产类别一致性后批量写入 `discipline_sort_order`。
- 原因：避免与账户内排序写入逻辑耦合，保证接口语义清晰。
- 备选：复用账户排序接口并加条件分支；容易引入误写字段和回归风险。

### 4) 排序入口改为低干扰图标并贴近状态列

- 决策：纪律表排序入口由文本按钮改为小图标按钮，放置在“状态”列后并右对齐（同一行视觉尾部）；保持可点击面积与可访问性属性。
- 原因：该功能低频，需降低视觉抢占，同时保留可发现性。
- 备选：完全隐藏到二级菜单；发现成本过高，不采用。

### 5) 历史数据回填策略

- 决策：迁移时为每条持仓生成 `discipline_sort_order`，按当前稳定顺序（如 `assetClass, account_sort_order, id`）编号，确保升级前后展示尽量连续。
- 原因：避免上线后出现随机顺序。
- 备选：全部置零并依赖首次人工排序；初次体验差。

## Risks / Trade-offs

- [Risk] 双排序字段并存增加维护成本 → Mitigation: 在类型层显式区分 `accountSortOrder` 与 `disciplineSortOrder`，并在 API 命名中体现用途。
- [Risk] 纪律表排序更新请求可能误传跨资产类别 id → Mitigation: 服务端强校验 payload 中持仓的 `assetClass` 与当前排序域一致，不一致直接拒绝。
- [Risk] 小图标入口可发现性下降 → Mitigation: 保留 tooltip/aria-label，首次发布可在更新说明中提示。

## Migration Plan

1. 在 SQLite/PostgreSQL schema 与迁移中将 `sort_order` 重命名为 `account_sort_order`，并新增 `discipline_sort_order` 字段。
2. 编写回填逻辑，为历史持仓按稳定规则赋值。
3. 调整纪律表查询与重排写入 API，接入新字段。
4. 前端替换排序入口样式与位置，绑定新排序写入语义。
5. 回归验证：多账户同类别顺序、账户页排序不受影响、刷新后顺序保持。

## Open Questions

- 纪律总览排序是否需要支持“每个资产类别单独重排”与“全局跨类别重排”双模式（当前默认仅类别内重排）？
- 排序图标放在状态列后右对齐时，移动端是否需要额外浮层入口以避免误触？

## Implementation Notes

- 数据模型已落地：`holdings.sort_order` 迁移为 `holdings.account_sort_order`，并新增 `holdings.discipline_sort_order`（SQLite/PG 双迁移 + 快照）。
- 新建持仓时默认值策略已落地：
  - `account_sort_order` 按账户内末尾递增；
  - `discipline_sort_order` 按“用户 + 资产类别”末尾递增（含“股票基金”归一到“股票”的兼容）。
- 排序接口已扩展：`POST /api/holdings/reorder` 支持 `scope=account|discipline`，纪律模式要求携带 `assetClass` 且必须提交该类别全部持仓。
- 查询语义已分离：
  - 账户视图读取按 `account_sort_order, id`；
  - 纪律总览读取按 `discipline_sort_order, id`。
- 纪律表交互已调整：排序入口改为“状态列后右对齐”的小图标按钮，保留 `aria-label` 与 tooltip。
