## ADDED Requirements

### Requirement: 账户排序与纪律排序解耦

系统 SHALL 同时维护两套持仓顺序：账户视图使用账户内排序字段 `account_sort_order`（由原 `sort_order` 迁移命名）；纪律总览视图使用独立排序字段（如 `discipline_sort_order`）。两者修改 MUST 互不覆盖。

#### Scenario: 修改纪律排序不影响账户页

- **WHEN** 用户仅在纪律总览中调整并保存某资产类别内持仓顺序
- **THEN** 账户页持仓展示顺序保持原有账户内排序结果不变

#### Scenario: 修改账户排序不影响纪律总览

- **WHEN** 用户仅在账户页调整并保存账户内持仓顺序
- **THEN** 纪律总览持仓顺序保持原有独立排序结果不变
