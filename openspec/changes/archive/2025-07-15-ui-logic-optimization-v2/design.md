## Context

在 V1 基础上进行优化迭代。V1 使用 Next.js 16 + SQLite + Drizzle ORM + shadcn/ui + Tailwind CSS。本次变更涉及数据模型扩展、UI 交互重构和新增图表可视化。

## Goals / Non-Goals

**Goals:**
- Holding 支持本金/市值/收益率，提升投资分析能力
- 阈值全局共享，简化配置
- 饼状图可视化资产分布
- 纪律表与资产类别视角合并，减少页面层级
- 账户列表信息密度提升，交互优化

**Non-Goals:**
- 不做自动行情拉取
- 不做历史收益率曲线图（后期拓展）
- 不做移动端适配

## Decisions

### 1. 图表库：recharts
**选择**: recharts
**理由**: React 生态最成熟的图表库，支持 PieChart，轻量，API 简洁，SSR 兼容好。
**替代方案**: chart.js（需要额外 wrapper）、visx（过于底层）、nivo（包体积大）。

### 2. 全局阈值存储：复用 asset_classes 表 + 新增 settings 表
**选择**: 新增 settings 表存储全局配置（key-value），阈值存为 `warning_threshold` 和 `danger_threshold`。同时从 asset_classes 表移除独立阈值字段。
**理由**: settings 表通用性强，后续可存储其他全局配置。

### 3. Holding cost 字段：数据库迁移策略
**选择**: 新增 migration，为 holdings 表添加 `cost` 列（real 类型，默认 0）。迁移后将所有现有记录的 cost 设为当前 market_value。
**理由**: 保证现有数据不丢失，且迁移后收益率显示为 0%（合理默认值）。

### 4. 纪律表交互：可展开行（Expandable Row）
**选择**: 纪律表每行可点击展开，展开后显示该类别下的标的列表，标的行有编辑按钮触发 Dialog。
**理由**: 减少页面层级，用户在一个视图内完成"查看配置 → 查看标的 → 编辑标的"的完整流程。

### 5. 账户列表：紧凑单行布局
**选择**: 每个账户一行，左侧名称+币种，右侧总额/现金/持仓数，操作按钮用 icon button 收到最右。
**理由**: 信息密度高，减少垂直空间占用。

## Risks / Trade-offs

- [recharts 包体积] → 约 200KB gzip，对本地应用可接受
- [纪律表交互复杂度增加] → 展开/收起 + 内联编辑，需要仔细管理状态
- [数据库迁移] → 需要处理已有数据的 cost 回填，迁移脚本需测试
