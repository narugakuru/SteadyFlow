export interface TwelveDataQuote {
  symbol: string;
  price: number;
  updatedAt: string;
  source: "realtime" | "previous_close";
}

export interface TwelveDataRequest {
  requestId: string;
  candidates: Array<{
    symbol: string;
    exchange?: string;
  }>;
}

export interface TwelveDataBatchResult {
  requestId: string;
  quote: TwelveDataQuote | null;
  error?: string;
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
    const normalized = value.includes("T") ? value : value.replace(" ", "T");
    const dt = new Date(normalized);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toISOString();
    }
  }
  return "";
}

export async function fetchTwelveDataQuote(
  apiKey: string,
  request: { symbol: string; exchange?: string }
): Promise<TwelveDataQuote | null> {
  try {
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("symbol", request.symbol);
    if (request.exchange) {
      url.searchParams.set("exchange", request.exchange);
    }

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as Record<string, unknown>;
    if (!data || data.status === "error") {
      return null;
    }

    const realtime = toPositiveNumber(data.close) ?? toPositiveNumber(data.price);
    const previousClose = toPositiveNumber(data.previous_close);
    const price = realtime ?? previousClose;
    if (!price) {
      return null;
    }

    return {
      symbol: String(data.symbol ?? request.symbol),
      price,
      updatedAt: toIsoDatetime(data.datetime ?? data.timestamp),
      source: realtime ? "realtime" : "previous_close",
    };
  } catch {
    return null;
  }
}

async function fetchTwelveDataQuoteWithFallback(
  apiKey: string,
  request: TwelveDataRequest
): Promise<TwelveDataQuote | null> {
  const seen = new Set<string>();
  for (const candidate of request.candidates) {
    const symbol = candidate.symbol.trim();
    if (!symbol) continue;
    const key = `${symbol}|${candidate.exchange ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const quote = await fetchTwelveDataQuote(apiKey, candidate);
    if (quote) return quote;
  }
  return null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTwelveDataQuotesInBatches(
  apiKey: string,
  requests: TwelveDataRequest[],
  options?: { batchSize?: number; batchDelayMs?: number }
): Promise<TwelveDataBatchResult[]> {
  if (!apiKey || requests.length === 0) {
    return requests.map((req) => ({
      requestId: req.requestId,
      quote: null,
      error: "Twelve Data API Key 未配置",
    }));
  }

  const batchSize = Math.max(1, options?.batchSize ?? 8);
  const batchDelayMs = Math.max(0, options?.batchDelayMs ?? 65000);
  const results: TwelveDataBatchResult[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (req) => {
        const quote = await fetchTwelveDataQuoteWithFallback(apiKey, req);
        return {
          requestId: req.requestId,
          quote,
          error: quote ? undefined : "Twelve Data 无数据",
        } satisfies TwelveDataBatchResult;
      })
    );
    results.push(...batchResults);

    const hasMore = i + batchSize < requests.length;
    if (hasMore) {
      await delay(batchDelayMs);
    }
  }

  return results;
}
