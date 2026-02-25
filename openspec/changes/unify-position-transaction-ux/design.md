## Context

当前系统有三个主要页面（总览、账户、交易），各自独立管理持仓和交易的操作入口。持仓的创建/编辑只在账户详情页，交易的创建只在交易页，总览纪律表有一个简化版的持仓编辑弹窗。三个页面之间没有交叉导航，且总览页的编辑弹窗不区分 amount/shares 估值模式。

现有 API 层已经完备：holdings PUT 支持 price/shares/marketValue 等字段更新，transactions POST 支持所有交易类型。本次改动集中在前端组件层面。

## Goals / Non-Goals

**Goals:**
- 统一持仓编辑体验：所有展示持仓的地方使用相同的编辑逻辑，区分 amount/shares 模式
- shares 模式支持三字段联动编辑（股价/份额/市值），用户改任意两个字段，第三个自动计算
- 交易表单内可直接新建持仓，消除"先去账户页建持仓再回来交易"的割裂流程
- 账户详情页持仓可快捷发起交易，消除"建完持仓找不到交易入口"的困惑
- 页面间增加上下文相关的交叉导航

**Non-Goals:**
- 不改动后端 API 和数据模型
- 不重构页面路由结构
- 不做交易编辑功能（保持现有"只能删除不能编辑"的设计）
- 不做持仓详情独立页面

## Decisions

### Decision 1: 三字段联动编辑的状态管理

**选择**: "最后两次编辑锁定，第三个自动计算"模型

维护一个 `lastEdited: [field1, field2]` 数组（最近两次被手动编辑的字段），第三个字段自动计算。被计算的字段用浅色/斜体样式标识。

初始状态：`lastEdited = ["price", "shares"]`（默认锁定股价和份额，市值自动算）。

联动规则：
- 用户改股价 → lastEdited 更新为 `[..., "price"]`，保留最近两个
- 用户改份额 → lastEdited 更新为 `[..., "shares"]`
- 用户改市值 → lastEdited 更新为 `[..., "marketValue"]`
- 不在 lastEdited 中的那个字段 = 被计算字段

计算公式：
- 被计算字段是市值 → `marketValue = price × shares`
- 被计算字段是股价 → `price = marketValue / shares`（shares=0 时不计算）
- 被计算字段是份额 → `shares = marketValue / price`（price=0 时不计算）

**替代方案**: 切换按钮（"按股价更新"/"按市值更新"）— 逻辑更简单但交互更笨重，且无法覆盖"改份额"场景。

### Decision 2: 交易表单内新建持仓的交互方式

**选择**: 在持仓下拉选择器底部增加"➕ 新建持仓..."选项

点击后弹出简化版持仓创建表单（复用 HoldingForm 组件），创建成功后自动选中新持仓并刷新持仓列表。

简化版表单只需：名称、ticker、估值模式、资产类别、本金。不需要填市值/份额/股价（这些由即将创建的交易来决定）。

**替代方案**: 跳转到账户页创建 — 打断交易流程，体验差。

### Decision 3: 统一编辑弹窗组件

**选择**: 提取一个共享的 `HoldingEditDialog` 组件，同时被 `holdings-panel.tsx` 和 `discipline-table.tsx` 使用

该组件根据 holding 的 valuationMode 自动切换：
- amount 模式：显示名称、本金、市值、资产类别
- shares 模式：显示名称、本金、股价/份额/市值三字段联动、资产类别

当前 `discipline-table.tsx` 的 `InlineEditDialog` 和 `holdings-panel.tsx` 的 `HoldingForm` 逻辑重复且不一致，统一后消除这个问题。

### Decision 4: 快捷交易入口的实现

**选择**: 账户详情页每个持仓卡片增加"买入"/"卖出"按钮，点击后弹出交易表单（复用 TransactionForm 组件），自动预填账户和持仓

需要将 TransactionForm 从 `transactions/page.tsx` 提取为独立组件，支持通过 props 传入预选的 accountId 和 holdingId。

### Decision 5: 交叉导航的实现方式

**选择**: 使用内联文字链接而非独立导航组件

- 账户详情页持仓列表：每个持仓增加"交易记录 →"链接，跳转到 `/transactions?accountId=X&holdingId=Y`（需交易页支持 holdingId 筛选）
- 交易记录列表：每条交易的持仓名称变为可点击链接，跳转到 `/accounts?accountId=X`（需账户页支持 URL 参数自动选中账户）

## Risks / Trade-offs

- [三字段联动的边界情况] 当 shares=0 或 price=0 时除法会出问题 → 在这些情况下禁用对应的自动计算，保持字段为 0
- [TransactionForm 提取为共享组件] 需要调整 props 接口，可能影响现有交易页 → 保持向后兼容的 props 设计，新增的 props 都是可选的
- [交叉导航需要 URL 参数支持] 账户页和交易页需要支持通过 URL 参数预选状态 → 改动范围可控，只需在 useEffect 中读取 searchParams
