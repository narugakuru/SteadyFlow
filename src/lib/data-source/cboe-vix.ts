export interface CboeVixPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

function normalizeCboeDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, month, day, year] = match;
  return `${year}-${month}-${day}`;
}

export async function fetchCboeVixHistory(): Promise<CboeVixPoint[]> {
  try {
    const res = await fetch(
      "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv",
      {
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
        headers: {
          "User-Agent": "Mozilla/5.0 (InvestManage)",
        },
      }
    );
    if (!res.ok) return [];

    const text = (await res.text()).trim();
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) return [];

    const points: CboeVixPoint[] = [];
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const [rawDate, open, high, low, close] = line.split(",");
      const date = normalizeCboeDate(rawDate);
      const closeValue = Number.parseFloat(close);
      if (!date || !Number.isFinite(closeValue)) continue;

      points.push({
        date,
        open: Number.parseFloat(open) || 0,
        high: Number.parseFloat(high) || 0,
        low: Number.parseFloat(low) || 0,
        close: closeValue,
      });
    }

    return points;
  } catch {
    return [];
  }
}
