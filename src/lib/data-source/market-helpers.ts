export interface MarketHistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketSnapshotSeed {
  id: string;
  symbol: string;
  name: string;
  group: string;
  externalUrl: string;
}

function roundToStorage(value: number): number {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Number(safeValue.toFixed(4));
}

function getValidHistory(history: MarketHistoryPoint[]): MarketHistoryPoint[] {
  return history.filter((point) => Number.isFinite(point.close) && point.close > 0);
}

export function buildIndexSnapshotFromHistory(
  config: MarketSnapshotSeed,
  history: MarketHistoryPoint[]
) {
  const validHistory = getValidHistory(history);
  if (validHistory.length === 0) {
    return {
      id: config.id,
      symbol: config.symbol,
      name: config.name,
      price: 0,
      change: 0,
      changePercent: 0,
      updatedAt: "",
      group: config.group,
      source: "stooq" as const,
      externalUrl: config.externalUrl,
    };
  }

  const latest = validHistory[validHistory.length - 1];
  const previous = validHistory.length > 1 ? validHistory[validHistory.length - 2] : null;
  const change = previous ? latest.close - previous.close : 0;
  const changePercent = previous && previous.close > 0 ? (change / previous.close) * 100 : 0;

  return {
    id: config.id,
    symbol: config.symbol,
    name: config.name,
    price: latest.close,
    change: roundToStorage(change),
    changePercent: roundToStorage(changePercent),
    updatedAt: `${latest.date}T00:00:00`,
    group: config.group,
    source: "stooq" as const,
    externalUrl: config.externalUrl,
  };
}

export function calculateAthDrawdownFromHistory(history: MarketHistoryPoint[]) {
  const validHistory = getValidHistory(history);
  if (validHistory.length === 0) {
    return {
      lastAllTimeHighDate: null,
      drawdownPercent: null,
      statusEmoji: null,
    };
  }

  let allTimeHigh = -Infinity;
  let lastAllTimeHighDate = "";

  for (const point of validHistory) {
    if (
      point.close > allTimeHigh ||
      (point.close === allTimeHigh && point.date > lastAllTimeHighDate)
    ) {
      allTimeHigh = point.close;
      lastAllTimeHighDate = point.date;
    }
  }

  if (!Number.isFinite(allTimeHigh) || allTimeHigh <= 0 || !lastAllTimeHighDate) {
    return {
      lastAllTimeHighDate: null,
      drawdownPercent: null,
      statusEmoji: null,
    };
  }

  const latest = validHistory[validHistory.length - 1];
  const drawdownPercent = roundToStorage((latest.close / allTimeHigh - 1) * 100);

  return {
    lastAllTimeHighDate,
    drawdownPercent,
    statusEmoji: drawdownPercent < 0 ? "🐻" : "🚀",
  };
}
