## Why

当前资产类别（股票基金/黄金/债券）在数据库 schema 和前端代码中硬编码为 enum，无法扩展。投资者需要管理更多资产类别（如 REITS、商品、数字货币等），每次新增都需要改 schema + 迁移 + 改前端多处代码。

同时，更新持仓市值是投资者最频繁的操作，当前流程需要逐个账户、逐个持仓点击编辑，效率极低。

## What Changes

- **BREAKING** 移除 holdings 表 `asset_class` 列的 enum 约束，改为自由文本，由 `asset_classes` 表驱动可选值
- 前端所有资产类别下拉框、颜色映射、显示逻辑改为从 API 动态获取
- 新增"批量更新"页面，支持一个页面内查看并编辑所有持仓市值和账户总额，一键保存

## Capabilities

### New Capabilities
- `batch-update`: 批量更新持仓市值和账户总额的页面，支持跨账户一览、inline 编辑、一键保存

### Modified Capabilities
- `asset-allocation`: 资产类别从硬编码 enum 改为动态驱动，现金类别保持系统自动计算
- `holding-management`: 持仓的资产类别字段从 enum 改为动态选择，可选值来自 asset_classes 表
- `dashboard`: 资产类别视角的颜色映射和展示逻辑改为动态

## Impact

- 数据库：holdings 表 `asset_class` 列类型变更（enum → text），需要迁移
- API：`/api/asset-classes` 需返回完整类别列表供前端下拉使用；新增 `/api/batch-update` 端点
- 前端组件：`holdings-panel.tsx`、`asset-class-view.tsx`、`discipline-table.tsx` 中的硬编码类别引用需移除
- 新增页面：`/batch-update` 路由
