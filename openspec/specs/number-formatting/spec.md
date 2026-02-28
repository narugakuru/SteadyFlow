# number-formatting Specification

## Purpose

TBD - created by archiving change decimal-precision-config. Update Purpose after archive.

## Requirements

### Requirement: 集中式精度配置

系统 SHALL 在 `src/lib/format.ts` 中维护一个集中式精度配置常量 `PRECISION`，按数值类别定义显示精度和存储精度：

| 类别              | display | storage |
| ----------------- | ------- | ------- |
| amount（金额）    | 2       | 4       |
| percent（百分比） | 2       | 4       |
| price（价格）     | 3       | 4       |
| shares（份额）    | 4       | 4       |
| rate（汇率）      | 4       | 4       |

修改精度规则时只需修改此配置对象。

#### Scenario: 查看精度配置

- **WHEN** 开发者查看 `PRECISION` 常量
- **THEN** 可以看到所有数值类别的 display 和 storage 精度定义

#### Scenario: 修改精度规则

- **WHEN** 需要将金额显示精度从2位改为3位
- **THEN** 只需修改 `PRECISION.amount.display` 的值，所有金额显示自动生效

### Requirement: 金额格式化函数

系统 SHALL 提供 `formatAmount(value: number): string` 函数，按以下规则格式化金额：

- 整数不显示小数点（如 `10000` → `10,000`）
- 有小数时最多显示2位，去除尾部零（如 `10000.50` → `10,000.5`）
- 带千位分隔符

#### Scenario: 格式化整数金额

- **WHEN** 调用 `formatAmount(10000)`
- **THEN** 返回 `"10,000"`

#### Scenario: 格式化带小数金额

- **WHEN** 调用 `formatAmount(10000.56)`
- **THEN** 返回 `"10,000.56"`

#### Scenario: 格式化尾部有零的金额

- **WHEN** 调用 `formatAmount(10000.10)`
- **THEN** 返回 `"10,000.1"`

### Requirement: 百分比格式化函数

系统 SHALL 提供 `formatPercent(value: number): string` 函数，按以下规则格式化百分比数值（不含%号）：

- 整数不显示小数点（如 `10` → `10`）
- 有小数时最多显示2位，去除尾部零（如 `12.50` → `12.5`）

#### Scenario: 格式化整数百分比

- **WHEN** 调用 `formatPercent(10)`
- **THEN** 返回 `"10"`

#### Scenario: 格式化带小数百分比

- **WHEN** 调用 `formatPercent(12.34)`
- **THEN** 返回 `"12.34"`

#### Scenario: 格式化尾部有零的百分比

- **WHEN** 调用 `formatPercent(12.50)`
- **THEN** 返回 `"12.5"`

### Requirement: 价格格式化函数

系统 SHALL 提供 `formatPrice(value: number): string` 函数，按以下规则格式化价格：

- 整数不显示小数点（如 `100` → `100`）
- 有小数时最多显示3位，去除尾部零（如 `3.500` → `3.5`）

#### Scenario: 格式化整数价格

- **WHEN** 调用 `formatPrice(100)`
- **THEN** 返回 `"100"`

#### Scenario: 格式化带小数价格

- **WHEN** 调用 `formatPrice(3.141)`
- **THEN** 返回 `"3.141"`

#### Scenario: 格式化尾部有零的价格

- **WHEN** 调用 `formatPrice(3.500)`
- **THEN** 返回 `"3.5"`

### Requirement: 份额格式化函数

系统 SHALL 提供 `formatShares(value: number): string` 函数，按以下规则格式化份额：

- 整数不显示小数点，带千位分隔符（如 `10000` → `10,000`）
- 有小数时最多显示4位，去除尾部零（如 `1234.5600` → `1,234.56`）
- 带千位分隔符

#### Scenario: 格式化整数份额

- **WHEN** 调用 `formatShares(10000)`
- **THEN** 返回 `"10,000"`

#### Scenario: 格式化带小数份额

- **WHEN** 调用 `formatShares(1234.5678)`
- **THEN** 返回 `"1,234.5678"`

### Requirement: 汇率格式化函数

系统 SHALL 提供 `formatRate(value: number): string` 函数，固定显示4位小数（不去除尾部零）。

#### Scenario: 格式化汇率

- **WHEN** 调用 `formatRate(7.2)`
- **THEN** 返回 `"7.2000"`

#### Scenario: 格式化完整汇率

- **WHEN** 调用 `formatRate(7.2345)`
- **THEN** 返回 `"7.2345"`

### Requirement: 存储精度截断函数

系统 SHALL 提供 `roundForStorage(value: number, category?: string): number` 函数，将数值 round 到存储精度（默认4位小数）。

#### Scenario: 截断超过4位的小数

- **WHEN** 调用 `roundForStorage(3.33333)`
- **THEN** 返回 `3.3333`

#### Scenario: 不足4位的小数保持不变

- **WHEN** 调用 `roundForStorage(3.5)`
- **THEN** 返回 `3.5`

### Requirement: 通用格式化底层函数

系统 SHALL 提供 `formatNumber(value: number, maxDecimals: number): string` 底层函数，供特殊场景使用。规则同上：整数不显示小数点，有小数时最多显示 maxDecimals 位并去除尾部零，带千位分隔符。

#### Scenario: 自定义精度格式化

- **WHEN** 调用 `formatNumber(1234.5678, 3)`
- **THEN** 返回 `"1,234.568"`
