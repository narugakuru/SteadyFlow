import { exchangeRates } from "./schema";
import { eq } from "drizzle-orm";

const DEFAULT_RATES: Array<{ pair: string; rate: number }> = [
  { pair: "USD/CNY", rate: 7.2 },
  { pair: "HKD/CNY", rate: 0.92 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seed(db: any) {
  const now = new Date().toISOString();

  for (const { pair, rate } of DEFAULT_RATES) {
    const existing = await db
      .select()
      .from(exchangeRates)
      .where(eq(exchangeRates.currencyPair, pair));

    if (existing.length === 0) {
      await db.insert(exchangeRates).values({
        currencyPair: pair,
        rate,
        updatedAt: now,
      });
    }
  }
}
