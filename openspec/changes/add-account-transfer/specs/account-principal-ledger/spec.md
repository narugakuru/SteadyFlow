## ADDED Requirements

### Requirement: 账户互转迁移原始资金

系统 SHALL 在账户互转时按各账户本币金额迁移 `principal`：来源账户减少转出金额，目标账户增加实际到账金额。互转删除时 MUST 依据关联交易的 `principalDelta` 整组反向回滚。互转 MUST NOT 被解释为组合层面的新增或撤回本金。

#### Scenario: 同币种互转本金守恒

- **WHEN** 用户在两个 CNY 账户间互转 10000
- **THEN** 来源 principal 减少 10000，目标 principal 增加 10000

#### Scenario: 跨币种按本币迁移本金

- **WHEN** 用户从 CNY 账户转出 7200 并向 USD 账户实际转入 1000
- **THEN** 来源 principal 减少 7200 CNY，目标 principal 增加 1000 USD
