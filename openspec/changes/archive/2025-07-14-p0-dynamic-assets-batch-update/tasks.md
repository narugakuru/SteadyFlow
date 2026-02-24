## 1. 数据库 Schema 变更

- [x] 1.1 修改 `src/db/schema.ts`：holdings 表的 `assetClass` 从 `text("asset_class", { enum: [...] })` 改为 `text("asset_class").notNull()`
- [x] 1.2 修改 `src/lib/types.ts`：`Holding.assetClass` 从字面量联合类型改为 `string`
- [x] 1.3 运行 `drizzle-kit generate` 生成迁移文件，确认迁移 SQL 正确
- [x] 1.4 运行 `drizzle-kit migrate` 执行迁移

## 2. API 层：资产类别动态化

- [x] 2.1 修改 `POST /api/holdings`：添加校验逻辑，确保提交的 assetClass 存在于 asset_classes 表中且不为"现金"，否则返回 400
- [x] 2.2 修改 `PUT /api/holdings/[id]`：同上，添加 assetClass 校验逻辑
- [x] 2.3 确认 `/api/asset-classes` GET 端点已返回完整类别列表（现有逻辑应已满足）

## 3. 前端：移除硬编码资产类别

- [x] 3.1 修改 `src/components/holdings-panel.tsx`：移除 `ASSET_CLASS_COLORS` 硬编码映射，改为基于预定义颜色数组按索引分配；HoldingForm 中的资产类别 Select 从 API 动态获取选项（排除"现金"）
- [x] 3.2 修改 `src/components/discipline-table.tsx`：InlineEditDialog 的资产类别 Select 从 API 动态获取选项
- [x] 3.3 确认 `src/components/asset-class-view.tsx` 无硬编码类别依赖，完全依赖 API 返回的 allocation 数据
- [x] 3.4 `src/components/asset-class-settings.tsx` 增加"添加类别"功能，`/api/asset-classes` 增加 POST 端点

## 4. 批量更新 API

- [x] 4.1 创建 `src/app/api/batch-update/route.ts`：实现 `PUT` 端点，接收 `{ accounts: [{ id, totalBalance }], holdings: [{ id, marketValue }] }`，在单个事务中更新所有变更

## 5. 批量更新页面

- [x] 5.1 创建 `src/app/batch-update/page.tsx`：页面加载时获取所有账户和持仓数据，按账户分组展示
- [x] 5.2 实现 inline 编辑：每个持仓的市值和每个账户的总额显示为可编辑输入框，修改后标记"已修改"状态
- [x] 5.3 实现"保存所有变更"按钮：收集所有已修改的数据，调用 `PUT /api/batch-update`，成功后刷新数据并清除修改标记；无修改时按钮禁用
- [x] 5.4 添加返回 Dashboard 的导航按钮

## 6. Dashboard 导航更新

- [x] 6.1 修改 `src/app/page.tsx`：在 header 区域添加"批量更新"导航按钮，链接到 `/batch-update`

## 7. 验证

- [ ] 7.1 验证：在设置中添加新资产类别后，持仓表单的下拉框立即出现该类别
- [ ] 7.2 验证：使用新类别创建持仓后，纪律表和资产类别视角正确显示
- [ ] 7.3 验证：批量更新页面能正确加载所有账户和持仓，修改后一键保存成功
- [x] 7.4 验证：`tsc --noEmit` 无类型错误
