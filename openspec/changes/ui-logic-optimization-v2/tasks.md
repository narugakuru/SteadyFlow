## 1. 数据库变更

- [x] 1.1 Holdings 表新增 cost 列（real, default 0），生成迁移文件
- [x] 1.2 新增 settings 表（id, key, value），存储全局阈值配置
- [x] 1.3 迁移脚本：将现有 holdings 的 cost 回填为 market_value
- [x] 1.4 移除 asset_classes 表的 warning_threshold 和 danger_threshold 字段
- [x] 1.5 Seed：在 settings 表中预置 warning_threshold=3, danger_threshold=5
- [x] 1.6 运行 drizzle-kit generate 并验证迁移

## 2. API 更新

- [x] 2.1 更新 /api/holdings POST/PUT：支持 cost 字段，市值未填时默认等于 cost
- [x] 2.2 更新 /api/asset-allocation：使用全局阈值替代类别独立阈值，返回 holdings 含 cost 和收益率
- [x] 2.3 新增 /api/settings GET/PUT：读取和更新全局阈值配置
- [x] 2.4 移除 /api/asset-classes 中的阈值相关逻辑

## 3. 饼状图组件

- [x] 3.1 安装 recharts 依赖
- [x] 3.2 创建 PortfolioChart 组件：按大类饼状图（默认视角）
- [x] 3.3 实现按标的饼状图视角，含色系渐变
- [x] 3.4 实现大类/标的视角切换按钮

## 4. 纪律表重构

- [x] 4.1 重构 DisciplineTable：移除偏离列，状态列包含偏离信息
- [x] 4.2 实现可展开行：点击类别行展开显示标的列表
- [x] 4.3 展开行中显示标的详情：名称、账户、市值、收益率、占比
- [x] 4.4 现金类别展开显示各账户现金明细
- [x] 4.5 标的行添加编辑按钮，点击弹出编辑 Dialog

## 5. 持仓管理 UI 更新

- [x] 5.1 更新 HoldingForm：新增本金输入框，市值改为选填
- [x] 5.2 更新 HoldingsPanel 持仓列表：显示本金、市值、收益率
- [x] 5.3 HoldingsPanel 返回按钮移到右上角

## 6. 账户列表 UI 重构

- [x] 6.1 重构 AccountList：紧凑单行布局，操作按钮用 icon button
- [x] 6.2 移除账户卡片的大面积空白，信息水平排列

## 7. Dashboard 页面整合

- [x] 7.1 移除资产类别视角 Tab，仅保留账户列表
- [x] 7.2 集成 PortfolioChart 到总资产区域下方
- [x] 7.3 更新 AssetClassSettings：改为全局阈值设置
- [x] 7.4 验证构建通过
