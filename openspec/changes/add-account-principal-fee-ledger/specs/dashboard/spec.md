## ADDED Requirements

### Requirement: Dashboard cumulative PnL scope

Dashboard SHALL NOT add new secondary metrics for account principal, fee deductions, or account-level cumulative PnL as part of the principal ledger change. Dashboard MAY continue using its existing summary layout and existing holding/realized/unrealized read models until a separate Dashboard-specific change is introduced.

#### Scenario: Dashboard summary remains compact

- **WHEN** the user opens Dashboard after account principal support is added
- **THEN** the top summary area does not add extra principal, fee, or cumulative-PnL secondary indicators
