export interface TencentQuote {
  symbol: string;
  price: number;
  updatedAt: string;
  source: "realtime";
}

export interface TencentQuoteRequest {
  requestId: string;
  symbol: string;
}

export interface TencentQuoteBatchResult {
  requestId: string;
  quote: TencentQuote | null;
  error?: string;
}

interface TencentBatchFetchOutcome {
  quotesBySymbol: Map<string, TencentQuote>;
  hadNoneMatch: boolean;
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

function normalizeTicker(ticker: string) {
  return ticker.trim().toUpperCase();
}

export function toTencentSimpleQuoteSymbol(ticker: string): string | null {
  const normalizedTicker = normalizeTicker(ticker);
  const [rawCode, suffix] = normalizedTicker.split(".");
  if (!rawCode || !suffix) return null;

  const digitsOnly = rawCode.replace(/\D/g, "");
  if (!digitsOnly) return null;

  if (suffix === "SS") return `s_sh${digitsOnly.padStart(6, "0")}`;
  if (suffix === "SZ") return `s_sz${digitsOnly.padStart(6, "0")}`;
  if (suffix === "BJ") return `s_bj${digitsOnly.padStart(6, "0")}`;
  if (suffix === "HK") return `s_hk${digitsOnly.padStart(5, "0")}`;
  return null;
}

async function fetchTencentBatchOnce(symbols: string[]): Promise<TencentBatchFetchOutcome> {
  const requested = new Set(symbols);
  const url = `https://qt.gtimg.cn/q=${symbols.join(",")}`;

  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Referer: "https://gu.qq.com",
      "User-Agent": "Mozilla/5.0 (InvestManage)",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const raw = await res.text();
  const lines = raw
    .split(";")
    .map((line) => line.trim())
    .filter(Boolean);

  let hadNoneMatch = false;
  const quotesBySymbol = new Map<string, TencentQuote>();

  for (const line of lines) {
    const match = /^v_([^=]+)="(.*)"$/.exec(line);
    if (!match) continue;

    const symbol = match[1];
    if (symbol === "pv_none_match") {
      hadNoneMatch = true;
      continue;
    }
    if (!requested.has(symbol)) continue;

    const payload = match[2];
    const parts = payload.split("~");
    const price = toPositiveNumber(parts[3]);
    if (!price) continue;

    quotesBySymbol.set(symbol, {
      symbol,
      price,
      updatedAt: new Date().toISOString(),
      source: "realtime",
    });
  }

  return { quotesBySymbol, hadNoneMatch };
}

export async function fetchTencentQuotesInBatches(
  requests: TencentQuoteRequest[],
  options?: { batchSize?: number; maxRetries?: number }
): Promise<TencentQuoteBatchResult[]> {
  if (requests.length === 0) return [];

  const batchSize = Math.max(1, options?.batchSize ?? 30);
  const maxRetries = Math.max(0, options?.maxRetries ?? 1);
  const results: TencentQuoteBatchResult[] = [];

  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    const requestsBySymbol = new Map<string, TencentQuoteRequest[]>();
    for (const req of batch) {
      const list = requestsBySymbol.get(req.symbol) ?? [];
      list.push(req);
      requestsBySymbol.set(req.symbol, list);
    }

    const unresolvedSymbols = new Set(requestsBySymbol.keys());
    const quoteBySymbol = new Map<string, TencentQuote>();
    const errorBySymbol = new Map<string, string>();
    let sawNoneMatch = false;

    for (let attempt = 0; attempt <= maxRetries && unresolvedSymbols.size > 0; attempt += 1) {
      const symbols = [...unresolvedSymbols];
      try {
        const outcome = await fetchTencentBatchOnce(symbols);
        if (outcome.hadNoneMatch) {
          sawNoneMatch = true;
        }

        for (const [symbol, quote] of outcome.quotesBySymbol.entries()) {
          quoteBySymbol.set(symbol, quote);
          unresolvedSymbols.delete(symbol);
        }

        if (outcome.quotesBySymbol.size === 0 && !outcome.hadNoneMatch) {
          for (const symbol of unresolvedSymbols) {
            errorBySymbol.set(symbol, "Tencent 无可用价格");
          }
          break;
        }
      } catch {
        for (const symbol of unresolvedSymbols) {
          errorBySymbol.set(symbol, "Tencent 请求失败");
        }
      }
    }

    for (const symbol of unresolvedSymbols) {
      if (errorBySymbol.has(symbol)) continue;
      errorBySymbol.set(
        symbol,
        sawNoneMatch ? "Tencent 请求受限 (none_match)" : "Tencent 无可用价格"
      );
    }

    for (const req of batch) {
      const quote = quoteBySymbol.get(req.symbol);
      if (quote) {
        results.push({ requestId: req.requestId, quote });
        continue;
      }
      results.push({
        requestId: req.requestId,
        quote: null,
        error: errorBySymbol.get(req.symbol) ?? "Tencent 无可用价格",
      });
    }
  }

  return results;
}
