## Why

当前项目中数值的显示精度和存储精度分散在各个组件和 API 中（`.toFixed(2)`、`.toFixed(4)`、`toLocaleString()` 等），没有统一管理。修改精度规则需要逐文件排查，维护成本高且容易遗漏。需要将精度配置集中化，并统一数值格式化逻辑。

## What Changes

- 新增集中式精度配置常量，按数值类别定义显示精度和存储精度
- 新增统一的数值格式化工具函数（`formatAmount`、`formatPercent`、`formatPrice`、`formatShares`），整数不显示小数点，有小数时最多显示到配置的上限位数并去除尾部零
- 新增存储精度截断工具函数（`roundForStorage`），在数据写入前统一 round 到最多4位小数
- 替换所有组件和 API 中分散的 `.toFixed()` / `toLocaleString()` 调用为统一工具函数
- 汇率显示保持不变（4位小数）

精度规则：

| 类别                     | 显示精度    | 存储精度 |
| ------------------------ | ----------- | -------- |
| 金额（余额、市值、成本） | 最多2位     | 最多4位  |
| 百分比                   | 最多2位     | 最多4位  |
| 价格                     | 最多3位     | 最多4位  |
| 份额                     | 最多4位     | 最多4位  |
| 汇率                     | 4位（不变） | 4位      |

所有类别：整数不显示小数点。

## Capabilities

### New Capabilities

- `number-formatting`: 集中式数值精度配置与格式化工具函数

### Modified Capabilities

- `account-management`: 账户列表中金额、盈亏等数值改用统一格式化函数
- `holding-management`: 持仓行中价格、份额、市值等数值改用统一格式化函数
- `asset-allocation`: 纪律表中百分比、金额等数值改用统一格式化函数
- `batch-update`: 股价更新页数值改用统一格式化函数
- `visualization-charts`: 图表 tooltip/label 中数值改用统一格式化函数
- `transaction-management`: 交易表单和列表中数值改用统一格式化函数
- `dashboard`: 总览页数值改用统一格式化函数
- `daily-netvalue`: 净值页数值改用统一格式化函数
- `exchange-rate`: 汇率转换函数中存储精度改用统一截断函数

## Impact

- `src/lib/utils.ts`：新增精度配置常量和格式化函数
- `src/lib/exchange-rate.ts`：汇率转换结果改用统一截断
- `src/lib/hooks.ts`：三字段联动计算结果改用统一截断
- `src/components/*.tsx`：所有涉及数值显示的组件（约10个文件）替换为统一格式化调用
- `src/app/api/**/*.ts`：API 响应中的数值格式化改用统一函数
- 无新增依赖，无数据库 schema 变更，无 API 接口变更
