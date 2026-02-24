## Why

V1 版本功能验证通过，但在实际使用中发现几个体验和逻辑问题：持仓缺少本金/收益率概念无法评估投资表现；阈值按类别单独设置过于繁琐；Dashboard 缺少可视化图表；账户列表信息密度低浪费空间；资产类别视角和纪律表是割裂的，应该合并交互。

## What Changes

- **BREAKING**: Holding 数据模型新增 `cost`（投入本金）字段，`marketValue` 未填时默认等于 `cost`，新增收益率计算
- 资产类别阈值改为全局共享（所有类别使用同一套警告/危险阈值），移除每个类别的独立阈值
- Dashboard 新增饼状图，支持"按标的"和"按大类"两种视角切换
- 纪律表移除重复的"偏离"列，仅保留"状态"列
- 资产类别视角合并到纪律表中：点击纪律表的资产类别行即可展开查看该类别下的标的详情，点击标的可直接编辑
- 移除独立的"资产类别视角" Tab，纪律表承担双重职责
- 账户列表 UI 重构，提高信息密度，减少空白
- 账户持仓详情页的返回按钮从左上角移到右上角

## Capabilities

### New Capabilities
- `portfolio-chart`: Dashboard 饼状图组件，支持按标的/按大类切换展示资产占比

### Modified Capabilities
- `holding-management`: Holding 新增 cost 字段，收益率计算，市值默认等于本金，标的支持内联编辑
- `asset-allocation`: 阈值改为全局共享，纪律表移除偏离列，纪律表行可展开显示类别下标的详情
- `dashboard`: 集成饼状图，移除资产类别视角 Tab，账户列表 UI 紧凑化，持仓详情返回按钮移到右上角

## Impact

- 数据库 schema 变更：holdings 表新增 cost 列，asset_classes 表移除独立阈值字段，新增全局配置
- 需要引入图表库（recharts）
- 影响 API：/api/holdings, /api/asset-allocation, /api/asset-classes
- 影响组件：holdings-panel, discipline-table, account-list, asset-class-settings, asset-class-view（移除）, page.tsx
- 数据库迁移：需要为现有 holdings 数据补充 cost 默认值
