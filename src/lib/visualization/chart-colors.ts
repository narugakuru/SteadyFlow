// 资产类别颜色常量，供所有图表组件共享

export const CLASS_COLORS: Record<string, string> = {
  股票: "#3b82f6",
  黄金: "#eab308",
  债券: "#22c55e",
  现金: "#9ca3af",
};

export const CLASS_GRADIENTS: Record<string, string[]> = {
  股票: ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
  黄金: ["#eab308", "#facc15", "#fde047", "#fef08a", "#fef9c3"],
  债券: ["#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7"],
  现金: ["#9ca3af", "#d1d5db", "#e5e7eb", "#f3f4f6", "#f9fafb"],
};

export const FALLBACK_COLOR = "#6b7280";

export function getClassColor(name: string): string {
  return CLASS_COLORS[name] || FALLBACK_COLOR;
}

export function getClassGradients(name: string): string[] {
  return CLASS_GRADIENTS[name] || [FALLBACK_COLOR];
}
