## Requirements

### Requirement: 市场页下线

系统 SHALL 下线独立的 `/market` 市场概览页面。该页面不再作为当前产品主流程展示全球指数表、VIX 区域或其他市场概览内容；用户也不得通过全局导航进入该页面。

#### Scenario: 导航不显示市场

- **WHEN** 已登录用户查看全局导航
- **THEN** 导航中不显示“市场”或指向 `/market` 的入口

#### Scenario: 直接访问市场页

- **WHEN** 用户直接访问 `/market`
- **THEN** 系统不渲染旧市场概览页面，并重定向到 `/`

### Requirement: 市场数据代码暂留边界

系统 MAY 暂时保留无外部请求副作用的市场展示组件或计算辅助函数，以降低回滚和后续复用成本；但系统 MUST NOT 保留会为旧独立市场页执行外部数据读取的运行入口或读取模块（包括 `/api/market` 市场聚合 API、旧市场聚合数据服务、Stooq/CBOE 市场读取适配）。后续若重新启用市场分析，需要通过新的 OpenSpec 变更定义产品入口、数据源与展示契约。

#### Scenario: 保留未引用展示辅助代码

- **WHEN** 代码库中仍存在旧 VIX 展示组件、TradingView 展示组件或市场历史计算 helper
- **THEN** 只要它们不被旧 `/market` 页面渲染路径引用，系统仍满足当前市场页下线契约

#### Scenario: 市场聚合 API 下线

- **WHEN** 旧前端或外部调用尝试请求 `/api/market`
- **THEN** 系统没有可用的市场聚合 API 运行入口，且不会因此触发 Stooq、Tencent、CBOE VIX 或其他旧市场页外部数据读取

#### Scenario: 旧市场读取模块移除

- **WHEN** 代码库扫描市场数据源目录
- **THEN** 不存在旧市场聚合数据服务、Stooq 读取适配或 CBOE VIX 读取适配
