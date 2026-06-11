## Context

Dashboard already computes `totalPnl`, `unrealizedPnl`, and `realizedPnl` in the asset-allocation response. The current desired interaction is to avoid adding more always-visible metrics to the overview header while still making the PnL split discoverable.

## Goals / Non-Goals

**Goals:**

- Preserve the existing left-side total asset and account total PnL layout.
- Show holding PnL and realized PnL only when hovering the left-side total asset or PnL number area.
- Use a compact tooltip/popover visual that does not shift the chart layout.
- Keep PnL color semantics consistent with the configured A-share/US-share mode.

**Non-Goals:**

- Do not change PnL formulas, persistence, or API responses.
- Do not add right-side always-visible PnL metrics.
- Do not change performance/TWR view semantics.

## Decisions

- Pass a compact PnL breakdown model from `src/app/page.tsx` to `OverviewAssetTrend`, derived from existing `allocation.unrealizedPnl` and `allocation.realizedPnl`.
- Attach one shared hover target around the left-side headline/subline area so hovering either the asset number or PnL number reveals the same breakdown.
- Render the tooltip inside the overview component with absolute positioning and theme token classes, avoiding a new dependency.
- Keep the tooltip available on focus as well as hover so keyboard navigation can reveal the same details without changing the requested mouse behavior.

## Risks / Trade-offs

- [Risk] Tooltip content can visually collide with the chart on small screens. -> Mitigation: keep it compact and anchored near the headline area with wrapping constraints.
- [Risk] Hover-only content is not available on touch-only devices. -> Mitigation: also show on focus; mobile remains functionally unchanged and avoids cluttering the header.
