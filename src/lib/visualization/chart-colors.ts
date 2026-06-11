// 资产类别颜色常量，供所有图表组件共享

export const CLASS_COLORS: Record<string, string> = {
  股票: "var(--chart-1)",
  黄金: "var(--chart-4)",
  债券: "var(--status-success)",
  现金: "var(--muted-foreground)",
};

export const CLASS_GRADIENTS: Record<string, string[]> = {
  股票: [
    "var(--chart-1)",
    "color-mix(in oklch, var(--chart-1) 82%, var(--card))",
    "color-mix(in oklch, var(--chart-1) 66%, var(--card))",
    "color-mix(in oklch, var(--chart-1) 48%, var(--card))",
    "color-mix(in oklch, var(--chart-1) 30%, var(--card))",
  ],
  黄金: [
    "var(--chart-4)",
    "color-mix(in oklch, var(--chart-4) 82%, var(--card))",
    "color-mix(in oklch, var(--chart-4) 66%, var(--card))",
    "color-mix(in oklch, var(--chart-4) 48%, var(--card))",
    "color-mix(in oklch, var(--chart-4) 30%, var(--card))",
  ],
  债券: [
    "var(--status-success)",
    "color-mix(in oklch, var(--status-success) 82%, var(--card))",
    "color-mix(in oklch, var(--status-success) 66%, var(--card))",
    "color-mix(in oklch, var(--status-success) 48%, var(--card))",
    "color-mix(in oklch, var(--status-success) 30%, var(--card))",
  ],
  现金: [
    "var(--muted-foreground)",
    "color-mix(in oklch, var(--muted-foreground) 72%, var(--card))",
    "color-mix(in oklch, var(--muted-foreground) 56%, var(--card))",
    "color-mix(in oklch, var(--muted-foreground) 40%, var(--card))",
    "color-mix(in oklch, var(--muted-foreground) 24%, var(--card))",
  ],
};

export const FALLBACK_COLOR = "var(--muted-foreground)";

export function getClassColor(name: string): string {
  return CLASS_COLORS[name] || FALLBACK_COLOR;
}

export function getClassGradients(name: string): string[] {
  return CLASS_GRADIENTS[name] || [FALLBACK_COLOR];
}
