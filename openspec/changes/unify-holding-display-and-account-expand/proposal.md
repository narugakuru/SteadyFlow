## Why

当前纪律表（按资产类别）和账户页（按账户）展示持仓的格式和交互模式不统一：纪律表展开后持仓信息过于简略且不能做交易，账户页点击后跳转子页面丢失列表上下文。两个视角应该提供一致的持仓展示格式和操作能力，只在详细程度上有所区分。

## What Changes

- 创建统一的持仓行组件 `HoldingRow`，两个视角共用：
  - 第一行：名称 + 小字股票代码、市值、收益金额+收益率
  - 第二行：份额、均价、股价、总仓位占比
  - 纪律表模式额外显示所属账户名
- 账户页从"点击跳转子页面"改为"点击展开/折叠"模式：
  - 点击账户行展开，显示账户摘要（总额/持仓/现金）+ 持仓列表
  - 展开区域提供"编辑账户"和"添加持仓"按钮
  - 移除 HoldingsPanel 组件的使用，accounts/page.tsx 不再需要子页面切换逻辑
  - 保留 URL 参数 accountId 自动展开对应账户
- 统一操作按钮：
  - 纪律表持仓：交易、编辑（两个按钮）
  - 账户页持仓：交易、编辑、交易记录→、删除（四个按钮）
  - 交易按钮统一弹出 TransactionForm
  - 编辑按钮统一弹出 HoldingEditDialog
- 纪律表持仓增加交易能力（之前只能编辑）

## Capabilities

### New Capabilities

_无新增独立能力模块_

### Modified Capabilities

- `holding-management`: 持仓展示格式统一为两行布局（核心信息+详细信息），操作按钮标准化
- `dashboard`: 纪律表展开的持仓行升级为统一格式，增加交易按钮
- `account-management`: 账户列表从跳转模式改为展开/折叠模式，展开区域内嵌持仓列表和账户编辑入口

## Impact

- 前端组件改动：新增 `holding-row.tsx` 共享组件；重写 `discipline-table.tsx` 的展开区域；重写 `account-list.tsx` 为展开/折叠模式（内嵌持仓列表）；简化 `accounts/page.tsx`（移除子页面切换）
- `holdings-panel.tsx` 可能不再需要（其功能被 account-list 的展开模式吸收）
- API 无需改动
- 无数据模型变更
