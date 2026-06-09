export interface EodhdQuote {
  symbol: string;
  price: number;
  updatedAt: string;
  source: "realtime" | "previous_close";
}

export interface EodhdQuoteRequest {
  requestId: string;
  symbol: string;
}

export interface EodhdQuoteResult {
  requestId: string;
  symbol: string;
  quote: EodhdQuote | null;
  error?: string;
}

interface FetchEodhdQuotesOptions {
  batchSize?: number;
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const num = Number.parseFloat(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  }
  return null;
}

function toIsoDatetime(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1_000_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const dt = new Date(value);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }
  return "";
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function parseRealtimeQuote(row: Record<string, unknown>, fallbackSymbol: string) {
  const price = toPositiveNumber(row.close) ?? toPositiveNumber(row.price);
  if (!price) return null;

  return {
    symbol: String(row.code ?? row.symbol ?? row.ticker ?? fallbackSymbol),
    price,
    updatedAt: toIsoDatetime(row.timestamp ?? row.datetime),
    source: "realtime" as const,
  };
}

async function fetchEodhdRealtimeBatch(
  apiKey: string,
  symbols: string[]
): Promise<Map<string, EodhdQuote>> {
  const uniqueSymbols = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))];
  if (uniqueSymbols.length === 0) return new Map();

  try {
    const [primarySymbol, ...secondarySymbols] = uniqueSymbols;
    const url = new URL(`https://eodhd.com/api/real-time/${encodeURIComponent(primarySymbol)}`);
    url.searchParams.set("api_token", apiKey);
    url.searchParams.set("fmt", "json");
    if (secondarySymbols.length > 0) {
      url.searchParams.set("s", secondarySymbols.join(","));
    }

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return new Map();

    const data = (await res.json()) as unknown;
    const rows = Array.isArray(data) ? data : [data];
    const quoteBySymbol = new Map<string, EodhdQuote>();

    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const quote = parseRealtimeQuote(row as Record<string, unknown>, primarySymbol);
      if (!quote) continue;
      quoteBySymbol.set(normalizeSymbol(quote.symbol), quote);
    }

    return quoteBySymbol;
  } catch {
    return new Map();
  }
}

async function fetchEodhdPreviousClose(apiKey: string, symbol: string): Promise<EodhdQuote | null> {
  try {
    const url = new URL(`https://eodhd.com/api/eod/${encodeURIComponent(symbol)}`);
    url.searchParams.set("api_token", apiKey);
    url.searchParams.set("fmt", "json");
    url.searchParams.set("order", "d");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as unknown;
    const first = Array.isArray(data) ? data[0] : data;
    if (!first || typeof first !== "object") return null;
    const row = first as Record<string, unknown>;
    const price = toPositiveNumber(row.close) ?? toPositiveNumber(row.adjusted_close);
    if (!price) return null;

    return {
      symbol,
      price,
      updatedAt: toIsoDatetime(row.date),
      source: "previous_close",
    };
  } catch {
    return null;
  }
}

export async function fetchEodhdQuote(apiKey: string, symbol: string): Promise<EodhdQuote | null> {
  if (!apiKey) return null;
  const [result] = await fetchEodhdQuotesInBatches(apiKey, [{ requestId: symbol, symbol }], {
    batchSize: 1,
  });
  return result?.quote ?? null;
}

export async function fetchEodhdQuotesInBatches(
  apiKey: string,
  requests: EodhdQuoteRequest[],
  options: FetchEodhdQuotesOptions = {}
): Promise<EodhdQuoteResult[]> {
  if (requests.length === 0) return [];

  const batchSize = Math.max(1, options.batchSize ?? 10);
  if (!apiKey) {
    return requests.map((request) => ({
      ...request,
      quote: null,
      error: "未配置 API Key",
    }));
  }

  const results: EodhdQuoteResult[] = [];

  for (let start = 0; start < requests.length; start += batchSize) {
    const batch = requests.slice(start, start + batchSize);
    const realtimeBySymbol = await fetchEodhdRealtimeBatch(
      apiKey,
      batch.map((request) => request.symbol)
    );

    for (const request of batch) {
      const realtime = realtimeBySymbol.get(normalizeSymbol(request.symbol));
      if (realtime) {
        results.push({ ...request, quote: realtime });
        continue;
      }

      const previousClose = await fetchEodhdPreviousClose(apiKey, request.symbol);
      results.push({
        ...request,
        quote: previousClose,
        error: previousClose ? undefined : "无可用价格",
      });
    }
  }

  return results;
}
