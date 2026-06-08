## REMOVED Requirements

### Requirement: 股价更新页使用 LoadingSpinner 加载动画

**Reason**: The standalone Stock Price Update page is decommissioned.
**Migration**: Quote refresh remains available through Dashboard/manual, silent-client, and Cron flows.

### Requirement: 批量更新页面

**Reason**: The standalone `/batch-update` page is removed from the product surface.
**Migration**: Use Dashboard manual quote refresh for automatic quote updates and holding edit dialogs for manual holding value adjustments.

#### Scenario: Direct visit redirects

- **WHEN** a user directly visits `/batch-update`
- **THEN** the system redirects to `/` and does not render the old Stock Price Update screen

### Requirement: 批量更新市值显示

**Reason**: The standalone batch-update page UI no longer exists.
**Migration**: Use existing holding/account display formatting in account and discipline views.
