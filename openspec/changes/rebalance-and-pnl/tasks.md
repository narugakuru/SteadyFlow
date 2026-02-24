## 1. 类型扩展

- [ ] 1.1 `lib/types.ts` — AllocationItem 增加 `adjustAmount`、`totalCost`、`totalPnl` 字段
- [ ] 1.2 `lib/types.ts` — AllocationHolding 增加 `pnlAmount`、`pnlAmountCny` 字段

## 2. API 层

- [ ] 2.1 `api/asset-allocation/route.ts` — 每个持仓计算 pnlAmount（原始币种）和 pnlAmountCny（CNY）
- [ ] 2.2 `api/asset-allocation/route.ts` — 每个类别汇总 totalCost、totalPnl（现金类别为 0）
- [ ] 2.3 `api/asset-allocation/route.ts` — 每个类别计算 adjustAmount = (targetPct/100) × totalAssetCny - actualValue

## 3. 纪律表盈亏列

- [ ] 3.1 `components/discipline-table.tsx` — 表头增加"盈亏"列
- [ ] 3.2 `components/discipline-table.tsx` — 每行显示汇总盈亏金额（正绿负红），现金行显示"--"

## 4. 再平衡建议组件

- [ ] 4.1 新建 `components/rebalance-panel.tsx` — 接收 allocation 和 totalAssetCny，展示调仓建议卡片列表
- [ ] 4.2 `rebalance-panel.tsx` — 超配显示"建议卖出 ¥X"（红色），低配显示"建议买入 ¥X"（绿色），均衡时显示"当前配置均衡，无需调整"
- [ ] 4.3 `app/page.tsx` — 在纪律表下方、账户列表上方插入 RebalancePanel 组件
