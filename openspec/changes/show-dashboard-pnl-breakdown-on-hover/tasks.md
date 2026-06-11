## 1. Data Preparation

- [ ] 1.1 Locate the Dashboard overview PnL calculation and current `OverviewAssetTrend` props.
- [ ] 1.2 Prepare holding PnL and realized PnL amount/percentage labels from existing allocation data.
- [ ] 1.3 Preserve the existing total asset and account total PnL labels as the only always-visible headline metrics.

## 2. Hover Tooltip UI

- [ ] 2.1 Add a compact breakdown model prop to `OverviewAssetTrend`.
- [ ] 2.2 Render a lightweight hover/focus tooltip anchored to the left-side asset/PnL number area.
- [ ] 2.3 Ensure the tooltip displays holding PnL and realized PnL amount/percentage with configured A-share/US-share color semantics.
- [ ] 2.4 Ensure the tooltip does not shift the chart layout or add permanent right-side metrics.

## 3. Documentation Sync

- [ ] 3.1 Sync the finalized hover behavior into `openspec/specs/dashboard/spec.md`.
- [ ] 3.2 Update `project_overview.md` progress with the feature change.

## 4. Verification

- [ ] 4.1 Run relevant formatting, lint, and typecheck validation.
- [ ] 4.2 Inspect git diff to ensure only intended files changed.
