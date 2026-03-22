import { roundForStorage } from "../utils/format";
import { fetchCboeVixHistory } from "./cboe-vix";
import {
  buildIndexSnapshotFromHistory,
  calculateAthDrawdownFromHistory,
  type MarketHistoryPoint,
} from "./market-helpers";
import {
  MARKET_ATH_CONFIG,
  MARKET_INDEX_CONFIG,
  type MarketApiResponse,
  type MarketAthConfigItem,
  type MarketAthDrawdown,
  type MarketIndexConfigItem,
  type MarketIndexSnapshot,
  type MarketVixData,
} from "./market-config";
import { fetchStooqHistory } from "./stooq";
import { fetchTencentMarketSnapshotsInBatches } from "./tencent-quote";

export {
  MARKET_ATH_CONFIG,
  MARKET_GROUPS,
  MARKET_INDEX_CONFIG,
  type MarketApiResponse,
  type MarketAthDrawdown,
  type MarketIndexSnapshot,
  type MarketVixData,
} from "./market-config";

const STQ_HISTORY_START = "20100101";
const VIX_SERIES_LIMIT = 252;

function formatHistoryRangeDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildEmptyIndex(config: MarketIndexConfigItem): MarketIndexSnapshot {
  return {
    id: config.id,
    symbol: config.symbol,
    name: config.name,
    price: 0,
    change: 0,
    changePercent: 0,
    updatedAt: "",
    group: config.group,
    source: config.provider === "tencent" ? "tencent" : "stooq",
    externalUrl: config.externalUrl,
  };
}

function buildEmptyAthDrawdown(config: MarketAthConfigItem): MarketAthDrawdown {
  return {
    id: config.id,
    name: config.name,
    lastAllTimeHighDate: null,
    drawdownPercent: null,
    statusEmoji: null,
  };
}

function buildAthDrawdown(
  config: MarketAthConfigItem,
  history: MarketHistoryPoint[]
): MarketAthDrawdown {
  const metrics = calculateAthDrawdownFromHistory(history);
  return {
    id: config.id,
    name: config.name,
    lastAllTimeHighDate: metrics.lastAllTimeHighDate,
    drawdownPercent: metrics.drawdownPercent,
    statusEmoji: metrics.statusEmoji,
  };
}

function buildVixData(points: Awaited<ReturnType<typeof fetchCboeVixHistory>>): MarketVixData {
  const validPoints = points.filter((point) => Number.isFinite(point.close) && point.close > 0);
  if (validPoints.length === 0) {
    return {
      latest: null,
      latestAt: null,
      series: [],
    };
  }

  const series = validPoints.slice(-VIX_SERIES_LIMIT).map((point) => ({
    date: point.date,
    close: point.close,
  }));
  const latest = validPoints[validPoints.length - 1];

  return {
    latest: latest.close,
    latestAt: `${latest.date}T00:00:00`,
    series,
  };
}

async function mapWithConcurrency<T, U>(
  items: readonly T[],
  limit: number,
  worker: (item: T) => Promise<U>
): Promise<U[]> {
  const results: U[] = [];
  for (let start = 0; start < items.length; start += limit) {
    const slice = items.slice(start, start + limit);
    const settled = await Promise.all(slice.map((item) => worker(item)));
    results.push(...settled);
  }
  return results;
}

export async function fetchMarketData(): Promise<MarketApiResponse> {
  const historyRange = {
    from: STQ_HISTORY_START,
    to: formatHistoryRangeDate(new Date()),
  };

  const stooqSymbols = new Set<string>();
  for (const config of MARKET_INDEX_CONFIG) {
    if (config.provider === "stooq-history") {
      stooqSymbols.add(config.sourceSymbol);
    }
  }
  for (const config of MARKET_ATH_CONFIG) {
    stooqSymbols.add(config.sourceSymbol);
  }

  const [stooqHistoryEntries, tencentResults, vixHistory] = await Promise.all([
    mapWithConcurrency([...stooqSymbols], 4, async (symbol) => {
      const history = await fetchStooqHistory(symbol, historyRange);
      return [symbol, history] as const;
    }),
    fetchTencentMarketSnapshotsInBatches(
      MARKET_INDEX_CONFIG.filter((config) => config.provider === "tencent").map((config) => ({
        requestId: config.id,
        symbol: config.sourceSymbol,
      }))
    ),
    fetchCboeVixHistory(),
  ]);

  const stooqHistoryBySymbol = new Map<string, MarketHistoryPoint[]>(stooqHistoryEntries);
  const tencentByRequestId = new Map(
    tencentResults
      .filter((result) => result.quote)
      .map((result) => [result.requestId, result.quote!])
  );

  const indices = MARKET_INDEX_CONFIG.map((config) => {
    if (config.provider === "tencent") {
      const quote = tencentByRequestId.get(config.id);
      if (!quote) return buildEmptyIndex(config);

      return {
        id: config.id,
        symbol: config.symbol,
        name: config.name,
        price: quote.price,
        change: roundForStorage(quote.change, "amount"),
        changePercent: roundForStorage(quote.changePercent, "percent"),
        updatedAt: quote.updatedAt,
        group: config.group,
        source: "tencent" as const,
        externalUrl: config.externalUrl,
      };
    }

    const snapshot = buildIndexSnapshotFromHistory(
      config,
      stooqHistoryBySymbol.get(config.sourceSymbol) ?? []
    );
    return {
      ...snapshot,
      group: config.group,
    };
  });

  const athDrawdowns = MARKET_ATH_CONFIG.map((config) => {
    const history = stooqHistoryBySymbol.get(config.sourceSymbol) ?? [];
    return history.length > 0 ? buildAthDrawdown(config, history) : buildEmptyAthDrawdown(config);
  });

  return {
    indices,
    vix: buildVixData(vixHistory),
    athDrawdowns,
    updatedAt: new Date().toISOString(),
  };
}
