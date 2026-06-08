## Why

当前资产配置纪律虽然在展开明细时会隐藏市值为 0 的标的，但后端仍会把这些记录查出来，再由前端二次过滤。结果是排序弹窗仍能看到零市值标的，且纪律视图的数据口径与真实可操作对象不一致。

## What Changes

- 将纪律视图使用的持仓查询收敛为专用数据源，在数据库检索阶段过滤零市值标的。
- 统一零市值判定口径，兼容持仓表中“直接市值字段”和“份额 × 价格”两种市值来源。
- 调整纪律排序弹窗与排序保存校验，使其仅面向当前可见、可排序的非零市值持仓。
- 保持账户页、批量更新页等全量持仓视图不受影响。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asset-allocation`: 纪律表展开明细的数据源改为数据库阶段过滤零市值标的，不再依赖展示层兜底隐藏。
- `discipline-overview-sorting`: 纪律排序弹窗与保存接口只处理当前资产类别下可见的非零市值持仓。

## Impact

- 受影响代码：`src/lib/services/portfolio-snapshot-service.ts`、纪律持仓相关服务、`/api/holdings/reorder`、Dashboard 纪律表与排序弹窗。
- 受影响 API：`GET /api/asset-allocation` 的纪律明细返回集合、纪律排序保存的服务端校验范围。
- 无新增依赖，无数据库 schema 变更。
