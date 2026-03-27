## Why

Dashboard 资产配置纪律表目前只能按数据库里的 `disciplineSortOrder` 展开持仓，用户无法在不打乱资产大类层级的前提下，临时按金额或持仓盈亏比较同一类别内的标的。桌面端缺少表头排序反馈，移动端也没有与卡片主数值对齐的排序控制，导致“快速找出类别内最大仓位/最大盈亏”的操作成本偏高。

## What Changes

- 为 Dashboard 资产配置纪律表新增明细三态排序：金额、持仓盈亏均支持 `降序 -> 升序 -> 默认` 循环，且排序比较前统一折算为同一货币。
- 排序作用域限定为每个资产类别内部的展开明细列表，资产类别自身顺序继续按数据库默认排序展示。
- 将纪律表排序偏好持久化到本地存储，刷新后仍恢复上次使用的字段与方向；默认态始终回退到数据库中的手动排序编号。
- 调整桌面端表头与移动端吸顶辅助栏视觉，补充排序状态高亮、箭头和圆点反馈。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dashboard`: Dashboard 纪律表新增类别内明细三态排序、本地排序偏好持久化，以及桌面端表头排序状态反馈。
- `mobile-responsive`: Dashboard 纪律表移动端新增 sticky 排序辅助栏，并与卡片金额/盈亏列保持对齐。

## Impact

- 受影响代码：`src/components/discipline-table.tsx`、`src/components/holding-row.tsx` 相关展示逻辑，以及新增的本地排序状态辅助代码。
- 受影响行为：Dashboard 桌面端与移动端都会共享同一套纪律表明细排序状态，但不会改写数据库中的 `disciplineSortOrder`。
- 不涉及数据库、API 或外部依赖变更。
