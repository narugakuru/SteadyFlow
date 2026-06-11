import type { Settings } from "@/lib/utils/types";

export const STATUS_COLOR_VARS = {
  success: "var(--status-success)",
  warning: "var(--status-warning)",
  danger: "var(--status-danger)",
} as const;

export const OVERVIEW_ASSET_COLORS = {
  line: "var(--status-success)",
  fill: "color-mix(in oklch, var(--status-success) 55%, var(--card))",
  dot: "var(--status-success)",
  axis: "var(--muted-foreground)",
  cursor: "color-mix(in oklch, var(--foreground) 16%, transparent)",
} as const;

export const COMPOSITION_CHART_COLORS = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-3)",
  "color-mix(in oklch, var(--chart-2) 70%, var(--status-success))",
  "color-mix(in oklch, var(--chart-5) 72%, var(--status-danger))",
  "color-mix(in oklch, var(--chart-4) 70%, var(--status-success))",
] as const;

export function getStatusColor(status: "normal" | "warning" | "danger") {
  if (status === "danger") return STATUS_COLOR_VARS.danger;
  if (status === "warning") return STATUS_COLOR_VARS.warning;
  return STATUS_COLOR_VARS.success;
}

export function getHeatmapColor(returnRate: number | null, colorMode: Settings["colorMode"]) {
  if (returnRate === null || returnRate === 0) {
    return "color-mix(in oklch, var(--muted) 88%, var(--foreground))";
  }

  const absRate = Math.abs(returnRate);
  const strength = absRate >= 15 ? 72 : absRate >= 5 ? 54 : 36;
  const positiveUsesDanger = colorMode === "cn";
  const token =
    returnRate > 0 === positiveUsesDanger ? STATUS_COLOR_VARS.danger : STATUS_COLOR_VARS.success;

  return `color-mix(in oklch, ${token} ${strength}%, var(--card))`;
}
