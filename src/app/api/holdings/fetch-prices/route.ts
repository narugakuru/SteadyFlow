import { NextResponse } from "next/server";
import { db } from "@/db";
import { holdings, accounts } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import { fetchStooqQuote } from "@/lib/stooq";
import { fetchYahooQuotes } from "@/lib/yahoo";

/**
 * 按 ticker 后缀判断数据源：
 * - .us / .jp → Stooq
 * - .SS / .SZ / .HK → Yahoo
 * - 其他 → 不支持
 */
function getTickerSource(ticker: string): "stooq" | "yahoo" | null {
  const lower = ticker.toLowerCase();
  if (lower.endsWith(".us") || lower.endsWith(".jp")) return "stooq";
  if (ticker.endsWith(".SS") || ticker.endsWith(".SZ") || ticker.endsWith(".HK")) return "yahoo";
  return null;
}

interface UpdatedItem {
  id: number;
  name: string;
  ticker: string;
  oldPrice: number;
  newPrice: number;
}
interface FailedItem {
  id: number;
  name: string;
  ticker: string;
  error: string;
}
interface SkippedItem {
  id: number;
  name: string;
  ticker: string | null;
  reason: string;
}

export async function POST() {
  const { userId, response } = await requireUser();
  if (!userId) return response;

  // 查询当前用户所有持仓
  const userAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  const accountIds = userAccounts.map((a: { id: number }) => a.id);
  if (accountIds.length === 0) {
    return NextResponse.json({ updated: [], failed: [], skipped: [] });
  }

  const allHoldings = await db
    .select()
    .from(holdings)
    .where(inArray(holdings.accountId, accountIds));

  const updated: UpdatedItem[] = [];
  const failed: FailedItem[] = [];
  const skipped: SkippedItem[] = [];

  // 分组
  const stooqHoldings: typeof allHoldings = [];
  const yahooHoldings: typeof allHoldings = [];

  for (const h of allHoldings) {
    if (h.valuationMode !== "shares") {
      skipped.push({ id: h.id, name: h.name, ticker: h.ticker, reason: "amount 模式" });
      continue;
    }
    if (!h.ticker) {
      skipped.push({ id: h.id, name: h.name, ticker: null, reason: "无股票代码" });
      continue;
    }
    const source = getTickerSource(h.ticker);
    if (source === "stooq") {
      stooqHoldings.push(h);
    } else if (source === "yahoo") {
      yahooHoldings.push(h);
    } else {
      skipped.push({ id: h.id, name: h.name, ticker: h.ticker, reason: "不支持的代码格式" });
    }
  }

  // Stooq: 逐个请求
  for (const h of stooqHoldings) {
    try {
      const quote = await fetchStooqQuote(h.ticker!);
      if (quote && quote.close > 0) {
        const oldPrice = h.price;
        const newPrice = quote.close;
        const newMarketValue = h.shares * newPrice;
        await db
          .update(holdings)
          .set({
            price: newPrice,
            marketValue: newMarketValue,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(holdings.id, h.id));
        updated.push({ id: h.id, name: h.name, ticker: h.ticker!, oldPrice, newPrice });
      } else {
        failed.push({ id: h.id, name: h.name, ticker: h.ticker!, error: "Stooq 无数据" });
      }
    } catch {
      failed.push({ id: h.id, name: h.name, ticker: h.ticker!, error: "Stooq 请求失败" });
    }
  }

  // Yahoo: 批量请求
  if (yahooHoldings.length > 0) {
    const yahooSymbols = yahooHoldings.map((h: { ticker: string | null }) => h.ticker!);
    const yahooQuotes = await fetchYahooQuotes(yahooSymbols);
    const quoteMap = new Map(yahooQuotes.map((q) => [q.symbol, q]));

    for (const h of yahooHoldings) {
      const quote = quoteMap.get(h.ticker!);
      if (quote && quote.price > 0) {
        const oldPrice = h.price;
        const newPrice = quote.price;
        const newMarketValue = h.shares * newPrice;
        await db
          .update(holdings)
          .set({
            price: newPrice,
            marketValue: newMarketValue,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(holdings.id, h.id));
        updated.push({ id: h.id, name: h.name, ticker: h.ticker!, oldPrice, newPrice });
      } else {
        failed.push({ id: h.id, name: h.name, ticker: h.ticker!, error: "Yahoo 无数据" });
      }
    }
  }

  return NextResponse.json({ updated, failed, skipped });
}
