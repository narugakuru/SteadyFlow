import { normalizeAssetClassName } from "@/lib/utils/asset-class";

const COLORS = [
  "border-border bg-chart-1/15 text-foreground",
  "border-border bg-chart-4/20 text-foreground",
  "border-border bg-status-success/15 text-foreground",
  "border-border bg-chart-2/15 text-foreground",
  "border-border bg-chart-5/15 text-foreground",
  "border-border bg-status-warning/15 text-foreground",
  "border-border bg-status-danger/15 text-foreground",
  "border-border bg-accent text-accent-foreground",
  "border-border bg-muted text-foreground",
  "border-border bg-secondary text-secondary-foreground",
];

const colorCache = new Map<string, string>();

export function getAssetClassColor(className: string): string {
  const normalizedName = normalizeAssetClassName(className);
  if (colorCache.has(normalizedName)) return colorCache.get(normalizedName)!;
  const index = colorCache.size % COLORS.length;
  const color = COLORS[index];
  colorCache.set(normalizedName, color);
  return color;
}
