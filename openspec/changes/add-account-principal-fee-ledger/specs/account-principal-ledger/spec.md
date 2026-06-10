## ADDED Requirements

### Requirement: Account principal storage

The system SHALL store each account's net principal in the account's native currency. Principal SHALL be an account aggregate that can be manually set by account create/edit operations and automatically changed only by deposit and withdrawal transactions.

#### Scenario: New account principal

- **WHEN** a user creates an account with `principal=100000`
- **THEN** the account stores principal as `100000` in the account currency

#### Scenario: Principal is account-native

- **WHEN** a USD account stores `principal=5000`
- **THEN** the value represents `5000 USD`, not a CNY-converted amount

### Requirement: Principal cash-flow updates

The system SHALL increase account principal by deposit amount and decrease account principal by withdrawal amount. Buy, sell, dividend, and fee transactions MUST NOT directly change principal.

#### Scenario: Deposit increases principal

- **WHEN** a user creates a deposit transaction with amount `20000`
- **THEN** the target account principal increases by `20000`

#### Scenario: Withdrawal decreases principal

- **WHEN** a user creates a withdrawal transaction with amount `8000`
- **THEN** the target account principal decreases by `8000`

#### Scenario: Fee does not change principal

- **WHEN** a user creates a fee transaction with amount `100`
- **THEN** the target account principal remains unchanged

### Requirement: Cumulative PnL calculation

The system SHALL calculate account cumulative PnL as `accountValue - principal`, where `accountValue = cashBalance + holdingsValue`. The system SHALL calculate cumulative PnL percentage as `cumulativePnl / principal` only when `principal > 0`; otherwise the percentage MUST display as `--`.

#### Scenario: Positive principal percentage

- **WHEN** account value is `120000` and principal is `100000`
- **THEN** cumulative PnL is `20000` and cumulative PnL percentage is `20%`

#### Scenario: Non-positive principal percentage

- **WHEN** account value is `30000` and principal is `0`
- **THEN** cumulative PnL amount still displays as `30000` and cumulative PnL percentage displays as `--`

### Requirement: Fee transaction side effects

The system SHALL support a standalone fee transaction that requires account, date, amount, and optional note. Fee transactions MUST reduce account cash by the amount, MUST reduce realized PnL by the amount, MUST NOT require or change a holding, and MUST NOT change principal.

#### Scenario: Fee reduces cash and realized PnL

- **WHEN** a user creates a fee transaction with amount `50`
- **THEN** account cash decreases by `50`, account realized PnL decreases by `50`, and account principal is unchanged

### Requirement: Transaction side-effect deltas

The system SHALL store transaction side-effect deltas for new transactions so deletion can apply exact reverse changes to cash, principal, realized PnL, and holding state. For shares-mode holdings, holding cost delta MUST represent total cost-basis change rather than average-cost change.

#### Scenario: Deposit delta

- **WHEN** a user creates a deposit transaction with amount `1000`
- **THEN** the transaction stores `cashDelta=1000` and `principalDelta=1000`

#### Scenario: Fee delta

- **WHEN** a user creates a fee transaction with amount `25`
- **THEN** the transaction stores `cashDelta=-25`, `principalDelta=0`, and `realizedPnl=-25`

#### Scenario: Shares buy cost basis delta

- **WHEN** a user buys `10` shares at price `12`
- **THEN** the transaction stores holding shares delta `10` and total cost-basis delta `120`

### Requirement: Transaction deletion rollback

The system SHALL delete transactions by applying reverse side-effect deltas and deleting the transaction record in the same mutation. The system MUST validate that rollback does not create invalid negative holding shares, cost basis, or market value.

#### Scenario: Delete deposit rolls back cash and principal

- **WHEN** a user deletes a deposit transaction with `cashDelta=1000` and `principalDelta=1000`
- **THEN** account cash decreases by `1000`, account principal decreases by `1000`, and the transaction record is deleted

#### Scenario: Delete fee rolls back cash and realized PnL

- **WHEN** a user deletes a fee transaction with `cashDelta=-50` and `realizedPnl=-50`
- **THEN** account cash increases by `50`, account realized PnL increases by `50`, and the transaction record is deleted

#### Scenario: Invalid rollback is rejected

- **WHEN** deleting a transaction would make a holding's shares or cost basis negative
- **THEN** the system rejects the deletion and leaves account, holding, and transaction records unchanged
