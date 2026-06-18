export interface TwelveDataQuote {
  symbol: string;
  price: number;
  updatedAt: string;
  source: "realtime";
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

interface TwelveDataAttemptResult {
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
  const result = await fetchTwelveDataQuoteAttempt(apiKey, request);
  return result.quote;
}

async function fetchTwelveDataQuoteAttempt(
  apiKey: string,
  request: { symbol: string; exchange?: string }
): Promise<TwelveDataAttemptResult> {
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
      return { quote: null, error: `HTTP ${res.status}` };
    }

    const data = (await res.json()) as Record<string, unknown>;
    if (!data || data.status === "error") {
      const message =
        typeof data?.message === "string" && data.message.trim()
          ? data.message.trim()
          : "Twelve Data 返回错误";
      return { quote: null, error: message };
    }

    const realtime = toPositiveNumber(data.price) ?? toPositiveNumber(data.close);
    if (!realtime) {
      const previousClose = toPositiveNumber(data.previous_close);
      return {
        quote: null,
        error: previousClose
          ? "仅返回 previous_close，未返回实时 price/close"
          : "未返回可用实时 price/close",
      };
    }

    return {
      quote: {
        symbol: String(data.symbol ?? request.symbol),
        price: realtime,
        updatedAt: toIsoDatetime(data.datetime ?? data.timestamp),
        source: "realtime",
      },
    };
  } catch {
    return { quote: null, error: "请求异常" };
  }
}

async function fetchTwelveDataQuoteWithFallback(
  apiKey: string,
  request: TwelveDataRequest
): Promise<TwelveDataAttemptResult> {
  const seen = new Set<string>();
  let lastError = "Twelve Data 无数据";
  for (const candidate of request.candidates) {
    const symbol = candidate.symbol.trim();
    if (!symbol) continue;
    const key = `${symbol}|${candidate.exchange ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const attempt = await fetchTwelveDataQuoteAttempt(apiKey, candidate);
    if (attempt.quote) return attempt;
    if (attempt.error) {
      lastError = `${symbol}${candidate.exchange ? ` (${candidate.exchange})` : ""}: ${attempt.error}`;
    }
  }
  return { quote: null, error: lastError };
}

export async function fetchTwelveDataQuotesInBatches(
  apiKey: string,
  requests: TwelveDataRequest[],
  options?: { batchSize?: number }
): Promise<TwelveDataBatchResult[]> {
  if (!apiKey || requests.length === 0) {
    return requests.map((req) => ({
      requestId: req.requestId,
      quote: null,
      error: "Twelve Data API Key 未配置",
    }));
  }

  const batchSize = Math.max(1, options?.batchSize ?? 8);
  const results: TwelveDataBatchResult[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (req) => {
        const attempt = await fetchTwelveDataQuoteWithFallback(apiKey, req);
        return {
          requestId: req.requestId,
          quote: attempt.quote,
          error: attempt.error,
        } satisfies TwelveDataBatchResult;
      })
    );
    results.push(...batchResults);
  }

  return results;
}
