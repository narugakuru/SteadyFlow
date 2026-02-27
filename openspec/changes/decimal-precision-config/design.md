## Context

当前项目中数值格式化逻辑分散在约 10 个组件和多个 API 路由中，使用 `.toFixed(2)`、`.toFixed(4)`、`toLocaleString()` 等方式各自处理。精度规则没有集中定义，修改时需要逐文件排查。

存储层（SQLite `real` / PostgreSQL `doublePrecision`）保存浮点原始值，无精度约束。数据来源（券商、API）的数值极端情况最多4位小数，大部分2位。

## Goals / Non-Goals

**Goals:**

- 将精度配置集中到一个常量对象，按数值类别（金额、百分比、价格、份额、汇率）定义显示精度和存储精度
- 提供统一的格式化函数，替换所有分散的 `.toFixed()` / `toLocaleString()` 调用
- 整数不显示小数点，有小数时去除尾部零，最多显示到配置上限
- 存储写入前统一 round 到最多4位小数

**Non-Goals:**

- 不修改数据库 schema（`real` / `doublePrecision` 类型不变）
- 不修改 API 接口结构
- 不处理历史数据的精度修正
- 不改变汇率的显示逻辑（保持4位）

## Decisions

### 1. 精度配置放在 `src/lib/format.ts` 独立文件

**选择**: 新建 `src/lib/format.ts`，不放在 `utils.ts` 中。

**理由**: format.ts 会包含配置常量 + 多个格式化函数 + 存储截断函数，内容较多且职责独立。utils.ts 保持通用工具函数的定位。

**替代方案**: 放在 utils.ts 中——会让 utils.ts 膨胀，且格式化是独立关注点。

### 2. 配置结构使用简单常量对象

**选择**:

```typescript
export const PRECISION = {
  amount: { display: 2, storage: 4 },
  percent: { display: 2, storage: 4 },
  price: { display: 3, storage: 4 },
  shares: { display: 4, storage: 4 },
  rate: { display: 4, storage: 4 },
} as const;
```

**理由**: 一目了然，修改精度只需改这一个对象。`as const` 保证类型安全。

**替代方案**: 用 enum 或 Map——过度设计，简单对象足够。

### 3. 格式化函数设计

**选择**: 提供按类别命名的便捷函数 + 一个通用底层函数：

```typescript
// 底层通用函数
formatNumber(value: number, maxDecimals: number): string
// 便捷函数
formatAmount(value: number): string    // 金额，最多2位小数，带千位分隔符
formatPercent(value: number): string   // 百分比，最多2位小数，不带%号
formatPrice(value: number): string     // 价格，最多3位小数
formatShares(value: number): string    // 份额，最多4位小数，带千位分隔符
formatRate(value: number): string      // 汇率，固定4位小数（保持现有行为）
roundForStorage(value: number, category?: keyof typeof PRECISION): number  // 存储截断
```

**理由**: 调用方只需 `formatAmount(value)` 而不是 `formatNumber(value, 2)`，语义清晰且不易出错。底层函数暴露出来供特殊场景使用。

**替代方案**: 只提供通用函数 `formatNumber(value, category)`——调用方需要记住类别字符串，不如直接函数名直观。

### 4. 整数判断与尾部零处理

**选择**: 使用 `parseFloat(value.toFixed(maxDecimals)).toLocaleString()` 的思路——先限制精度，再转回数字去掉尾部零，最后格式化千位分隔符。

**理由**: 一行搞定整数不显示小数、尾部零去除、千位分隔符。

### 5. 存储截断时机

**选择**: 在 API 路由的写入逻辑中调用 `roundForStorage()`，不在前端做。

**理由**: 存储精度是后端关注点，前端只负责显示格式化。API 是数据写入的唯一入口，在此截断最可靠。

### 6. 汇率格式化保持固定4位

**选择**: `formatRate()` 始终显示4位小数（用 `.toFixed(4)`），不去除尾部零。

**理由**: 汇率如 `7.2000` 显示为 `7.2` 会让人误以为精度不够。保持4位是金融惯例。

## Risks / Trade-offs

- **[显示变化]** 部分数值的显示精度会改变（如价格从4位变3位，占比从固定小数变为动态去零）→ 用户可能需要适应，但整体更简洁
- **[存储截断]** round 到4位可能导致极小的反算偏差（如 10000/3=3333.3333 存为 3333.3333，反算 9999.9999）→ 对个人投资管理可接受
- **[替换遗漏]** 分散在多文件中的格式化调用可能遗漏 → 通过全局搜索 `.toFixed` 和 `toLocaleString` 确保覆盖
