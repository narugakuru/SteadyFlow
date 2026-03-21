## ADDED Requirements

### Requirement: 市场页展示固定跟踪清单的历史高点回撤

系统 SHALL 在市场页顶部 VIX 区域下方展示固定跟踪清单的“距历史最高点回撤”列表。列表 MUST 至少覆盖以下标的：Bitcoin、DAX、Dow Jones Industrial Average、FTSE All-World、Gold、MSCI World、Nasdaq Composite、Nasdaq-100、Nikkei 225、S&P 500、SMI。每项 SHALL 展示名称、最近一次历史最高点日期、当前相对历史最高点的跌幅，以及配置定义的状态标记。

#### Scenario: 正常展示 ATH 回撤列表

- **WHEN** 用户打开市场页且跟踪清单的历史与最新价格数据可用
- **THEN** 页面在 VIX 区域下方显示固定顺序的 ATH 回撤列表，并为每项展示名称、历史高点日期、当前回撤百分比和状态标记

#### Scenario: 单项数据缺失时的兜底展示

- **WHEN** 跟踪清单中的某一项无法获取有效历史序列或最新价格
- **THEN** 页面仍显示该项名称和位置，其历史高点日期、回撤百分比和状态标记显示为 `--` 或空占位

### Requirement: ATH 回撤由服务端统一计算

系统 SHALL 在服务端基于配置化的历史源与最新值计算 ATH 回撤摘要，而不是在客户端扫描历史数据。历史高点日期 MUST 取该跟踪项最近一次创出历史最高收盘值的日期；回撤百分比 MUST 按 `(latest / allTimeHigh - 1) * 100` 计算，并以负值表示低于历史高点。

#### Scenario: 最近一次历史高点日期计算

- **WHEN** 某跟踪项的历史序列中多个日期达到同一最高收盘值
- **THEN** 系统返回最近一次达到该最高值的日期作为 `lastAllTimeHighDate`

#### Scenario: 回撤百分比计算

- **WHEN** 某跟踪项的历史最高收盘值为 100，最新值为 91.5
- **THEN** 系统返回约 `-8.50%` 的回撤结果，并供前端按统一格式展示
