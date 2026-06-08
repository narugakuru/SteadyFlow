## Requirements

### Requirement: 市场页 VIX 图表下线

系统 SHALL 下线与旧市场页绑定的 VIX 图表用户界面要求。当前产品不再要求在 `/market` 或其他主导航页面中展示 VIX 日线图、VIX 情绪参考或相关市场状态卡片。

#### Scenario: 市场页不展示 VIX 图表

- **WHEN** 用户直接访问 `/market`
- **THEN** 系统重定向到 `/`，不渲染 VIX 图表或 VIX 情绪说明

#### Scenario: VIX 组件暂留

- **WHEN** 代码库中仍存在 VIX 图表或情绪说明组件
- **THEN** 这些组件 MAY 暂时保留为未引用代码，但不构成当前用户可见能力
