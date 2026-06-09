## 1. Range Contract

- [x] 1.1 Extend `NetvalueChartRange` to include `7d`.
- [x] 1.2 Add `7d -> day` grain mapping and 7-day start date handling.
- [x] 1.3 Ensure `GET /api/netvalue/chart?range=7d` is accepted by shared range validation.

## 2. Dashboard Trend Range Preference

- [x] 2.1 Change the Dashboard asset trend default range to `30d`.
- [x] 2.2 Persist Dashboard asset trend range changes to browser local storage.
- [x] 2.3 Restore a valid persisted Dashboard asset trend range on page load and fall back to `30d` for invalid values.
- [x] 2.4 Display `7D` in the Dashboard range control.

## 3. Netvalue Chart Presentation

- [x] 3.1 Change the netvalue page default chart range to `30d`.
- [x] 3.2 Restyle the two netvalue charts as light card-style chart panels consistent with the Dashboard asset trend card.
- [x] 3.3 Hide Y axes, axis lines and tick lines in both netvalue charts while retaining bottom date labels.
- [x] 3.4 Remove visible point markers from the total asset trend line while preserving tooltip interaction.

## 4. Documentation And Verification

- [x] 4.1 Sync implemented behavior into main OpenSpec specs.
- [x] 4.2 Update `project_overview.md` progress log.
- [x] 4.3 Run relevant type/lint checks or focused verification.
