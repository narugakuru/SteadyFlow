## Requirements

### Requirement: 市场页 ATH 回撤列表下线

系统 SHALL 下线与旧市场页绑定的历史高点回撤列表用户界面要求。当前产品不再要求在 `/market` 或其他主导航页面中展示固定跟踪清单的 ATH 回撤信息。

#### Scenario: 市场页不展示 ATH 回撤列表

- **WHEN** 用户直接访问 `/market`
- **THEN** 系统重定向到 `/`，不渲染 ATH 回撤列表

#### Scenario: ATH 计算代码暂留

- **WHEN** 代码库中仍存在市场历史高点回撤配置或计算辅助函数
- **THEN** 这些代码 MAY 暂时保留为未引用或内部复用代码，但不构成当前用户可见能力
