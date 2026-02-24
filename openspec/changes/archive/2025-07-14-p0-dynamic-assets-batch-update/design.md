## Context

当前系统的资产类别在三个层面硬编码：
1. 数据库 schema：`holdings.asset_class` 是 `enum: ["股票基金", "黄金", "债券"]`
2. 前端组件：`holdings-panel.tsx` 的 Select 选项、`ASSET_CLASS_COLORS` 映射
3. 类型定义：`types.ts` 中 `Holding.assetClass` 是字面量联合类型

同时 `asset_classes` 表已经存在，包含 name/targetPct/thresholds，但仅用于配置目标占比，未作为持仓分类的数据源。

更新持仓市值的流程：Dashboard → 点击账户 → 进入持仓列表 → 逐个点编辑 → 改市值 → 保存 → 返回。多账户多持仓时极其低效。

## Goals / Non-Goals

**Goals:**
- holdings 的资产类别由 asset_classes 表动态驱动，新增类别只需在设置中添加
- 前端所有类别相关的硬编码移除，改为 API 驱动
- 提供批量更新页面，一屏展示所有持仓和账户总额，支持 inline 编辑和一键保存
- 数据库平滑迁移，不丢失现有数据

**Non-Goals:**
- 不做资产类别的颜色自定义（暂用自动分配方案）
- 不做持仓市值的自动抓取（如从券商 API 获取）
- 不改变现金的计算逻辑（仍为 totalBalance - 持仓市值之和）
- 不做资产类别的拖拽排序

## Decisions

### D1: holdings.asset_class 列类型变更

**选择：** 移除 enum 约束，改为普通 text 列。通过应用层校验确保值存在于 asset_classes 表中。

**替代方案：** 改为外键关联 asset_classes.id → 需要改所有查询逻辑，且按名称分组的现有逻辑全部要改。

**理由：** text 列改动最小，现有的按 `assetClass` 名称分组的逻辑（asset-allocation API、snapshot API）无需改动。应用层校验足够，不需要数据库级外键。

### D2: 前端类别颜色方案

**选择：** 预定义一个颜色数组（8-10 种），按 asset_classes 表的顺序循环分配。

**替代方案：** 在 asset_classes 表中增加 color 列 → 增加了配置复杂度，对用户来说不是核心需求。

**理由：** 简单够用，避免过度设计。

### D3: 批量更新的 API 设计

**选择：** 单个 `PUT /api/batch-update` 端点，接收 `{ accounts: [...], holdings: [...] }` 数组，在一个事务中更新所有变更。

**替代方案：** 前端逐个调用现有的 PUT 端点 → 无事务保证，N 个持仓就 N 次请求，慢且不可靠。

**理由：** 批量操作需要原子性，一个事务确保要么全部成功要么全部回滚。

### D4: 批量更新页面的路由

**选择：** `/batch-update` 作为独立页面，从 Dashboard header 导航进入。

**理由：** 批量更新是高频操作，值得一个独立入口，而不是藏在某个 dialog 里。

## Risks / Trade-offs

- **[数据迁移]** holdings 表列类型变更 → Drizzle 的 SQLite 迁移可能需要重建表。Mitigation: 先备份数据库，迁移脚本中保留现有数据。
- **[校验缺失]** 移除 enum 后数据库层不再校验类别合法性 → Mitigation: API 层在创建/更新 holding 时校验 assetClass 是否存在于 asset_classes 表。
- **[批量更新冲突]** 用户在批量更新页面编辑时，另一个 tab 也在改数据 → Mitigation: 暂不处理，单用户场景下概率极低。

## Migration Plan

1. 修改 `src/db/schema.ts`，holdings 的 `assetClass` 从 enum text 改为普通 text
2. 运行 `drizzle-kit generate` 生成迁移 SQL
3. 运行 `drizzle-kit migrate` 执行迁移
4. 现有数据无需变更（值本身不变，只是约束放开）
