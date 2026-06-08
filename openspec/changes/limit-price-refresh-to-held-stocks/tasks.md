## 1. Quote Candidate Scope

- [ ] 1.1 Locate the shared quote refresh service used by manual, silent, and cron triggers.
- [ ] 1.2 Add an active shares-mode holding predicate based on `shares > 0`.
- [ ] 1.3 Return non-active shares-mode holdings in `skipped` without calling quote providers.

## 2. Regression Coverage

- [ ] 2.1 Add or update tests for a sold-out shares-mode holding being skipped.
- [ ] 2.2 Verify exchange-rate refresh still runs when no holdings qualify for quote refresh.

## 3. Documentation And Validation

- [ ] 3.1 Sync the finalized behavior into main `openspec/specs`.
- [ ] 3.2 Update `project_overview.md` progress log.
- [ ] 3.3 Run the relevant validation commands.
