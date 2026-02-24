const COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-yellow-100 text-yellow-800",
  "bg-green-100 text-green-800",
  "bg-purple-100 text-purple-800",
  "bg-pink-100 text-pink-800",
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-800",
  "bg-teal-100 text-teal-800",
  "bg-cyan-100 text-cyan-800",
  "bg-rose-100 text-rose-800",
];

const colorCache = new Map<string, string>();

export function getAssetClassColor(className: string): string {
  if (colorCache.has(className)) return colorCache.get(className)!;
  const index = colorCache.size % COLORS.length;
  const color = COLORS[index];
  colorCache.set(className, color);
  return color;
}
