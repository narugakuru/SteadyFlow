export const DEFAULT_ASSET_CLASS_ORDER = ["股票", "黄金", "债券", "现金"] as const;

const DEFAULT_ORDER_INDEX: Map<string, number> = new Map(
  DEFAULT_ASSET_CLASS_ORDER.map((name, index) => [name, index] as [string, number])
);

const ALIAS_MAP: Record<string, string> = {
  股票基金: "股票",
};

export function normalizeAssetClassName(name: string): string {
  const trimmed = name.trim();
  return ALIAS_MAP[trimmed] ?? trimmed;
}

export function getDefaultAssetClassOrderIndex(name: string): number {
  const normalized = normalizeAssetClassName(name);
  return DEFAULT_ORDER_INDEX.get(normalized) ?? Number.MAX_SAFE_INTEGER;
}
