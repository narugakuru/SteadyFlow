export interface EodhdQuote {
  symbol: string;
  price: number;
  updatedAt: string;
  source: "realtime" | "previous_close";
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

async function fetchEodhdRealtime(apiKey: string, symbol: string): Promise<EodhdQuote | null> {
  try {
    const url = new URL(`https://eodhd.com/api/real-time/${encodeURIComponent(symbol)}`);
    url.searchParams.set("api_token", apiKey);
    url.searchParams.set("fmt", "json");

    const res = await fetch(url.toString(), {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>;
    const price = toPositiveNumber(data.close) ?? toPositiveNumber(data.price);
    if (!price) return null;

    return {
      symbol: String(data.code ?? symbol),
      price,
      updatedAt: toIsoDatetime(data.timestamp ?? data.datetime),
      source: "realtime",
    };
  } catch {
    return null;
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
  const realtime = await fetchEodhdRealtime(apiKey, symbol);
  if (realtime) return realtime;
  return fetchEodhdPreviousClose(apiKey, symbol);
}
