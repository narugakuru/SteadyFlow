## Requirements

### Requirement: Stooq 数据源停用边界

系统 SHALL NOT 在当前持仓自动报价、Dashboard 静默刷新、每日 Cron 报价刷新或独立市场页运行入口中请求 Stooq。旧 Stooq 适配模块不再作为当前代码能力保留。

#### Scenario: 美股报价不再使用 Stooq

- **WHEN** 当前用户有 shares 模式持仓 ticker=`aapl.us`
- **THEN** 系统不请求 Stooq，而是按自动报价能力定义走 Yahoo Finance 优先、EODHD 回退

#### Scenario: 独立市场页不触发 Stooq 读取

- **WHEN** 用户直接访问 `/market`
- **THEN** 系统重定向到 `/`，且不存在会为旧市场页读取 Stooq 数据的 API 运行入口

#### Scenario: Stooq 适配模块已移除

- **WHEN** 代码库扫描当前数据源适配层
- **THEN** 不存在可被业务运行入口调用的 Stooq 适配模块
