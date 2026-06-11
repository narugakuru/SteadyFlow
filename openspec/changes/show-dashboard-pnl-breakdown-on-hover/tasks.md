## 1. Data Preparation

- [x] 1.1 Locate the Dashboard overview PnL calculation and current `OverviewAssetTrend` props.
- [x] 1.2 Prepare holding PnL and realized PnL amount/percentage labels from existing allocation data.
- [x] 1.3 Preserve the existing total asset and account total PnL labels as the only always-visible headline metrics.

## 2. Hover Tooltip UI

- [x] 2.1 Add a compact breakdown model prop to `OverviewAssetTrend`.
- [x] 2.2 Render a lightweight hover/focus tooltip anchored to the left-side asset/PnL number area.
- [x] 2.3 Ensure the tooltip displays holding PnL and realized PnL amount/percentage with configured A-share/US-share color semantics.
- [x] 2.4 Ensure the tooltip does not shift the chart layout or add permanent right-side metrics.

## 3. Documentation Sync

- [x] 3.1 Sync the finalized hover behavior into `openspec/specs/dashboard/spec.md`.
- [x] 3.2 Update `project_overview.md` progress with the feature change.

## 4. Verification

- [x] 4.1 Run relevant formatting, lint, and typecheck validation.
- [x] 4.2 Inspect git diff to ensure only intended files changed.
