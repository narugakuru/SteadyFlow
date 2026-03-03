/**
 * Stooq CSV API 数据获取层
 *
 * 支持美股(.us)、日股(.jp)、指数(^xxx) 等 Stooq 覆盖的市场。
 * 纯 HTTP fetch，无需 npm 依赖。
 */

export interface StooqQuote {
  symbol: string;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 获取单个 Stooq 符号的最新行情
 * @returns 解析后的数据对象，失败或无数据时返回 null
 */
export async function fetchStooqQuote(symbol: string): Promise<StooqQuote | null> {
  try {
    const res = await fetch(
      `https://stooq.com/q/l/?s=${encodeURIComponent(symbol)}&f=sd2t2ohlcv&h&e=csv`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) return null;

    const values = lines[1].split(",");
    // CSV 列顺序: Symbol, Date, Time, Open, High, Low, Close, Volume
    if (values.length < 8) return null;

    const close = parseFloat(values[6]);
    // Stooq 返回 "N/D" 表示无数据
    if (isNaN(close)) return null;

    return {
      symbol: values[0],
      date: values[1],
      time: values[2],
      open: parseFloat(values[3]) || 0,
      high: parseFloat(values[4]) || 0,
      low: parseFloat(values[5]) || 0,
      close,
      volume: parseFloat(values[7]) || 0,
    };
  } catch {
    return null;
  }
}

/**
 * 批量获取多个 Stooq 符号的行情（逐个请求，避免并发限制）
 * @returns 成功获取的数据列表，失败的符号被跳过
 */
export async function fetchStooqQuotes(symbols: string[]): Promise<StooqQuote[]> {
  const results: StooqQuote[] = [];
  for (const symbol of symbols) {
    const quote = await fetchStooqQuote(symbol);
    if (quote) results.push(quote);
  }
  return results;
}
