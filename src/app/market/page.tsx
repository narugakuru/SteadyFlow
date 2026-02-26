"use client";

import { TickerTape } from "@/components/tradingview/ticker-tape";
import { MiniChart } from "@/components/tradingview/mini-chart";
import { AdvancedChart } from "@/components/tradingview/advanced-chart";
import { VixSentiment } from "@/components/vix-sentiment";

const tickerSymbols = [
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "NASDAQ:NDX", title: "纳斯达克100" },
  { proName: "DJ:DJI", title: "道琼斯" },
  { proName: "SSE:000300", title: "沪深300" },
  { proName: "SSE:000001", title: "上证指数" },
  { proName: "SZSE:399006", title: "创业板指" },
  { proName: "SSE:000905", title: "中证500" },
  { proName: "HSI:HSI", title: "恒生指数" },
  { proName: "TVC:HSTECH", title: "恒生科技" },
  { proName: "TVC:NI225", title: "日经225" },
  { proName: "TSE:TOPIX", title: "东证指数" },
  { proName: "CBOE:VIX", title: "VIX" },
];

interface IndexGroup {
  label: string;
  items: { symbol: string; name: string }[];
}

const indexGroups: IndexGroup[] = [
  {
    label: "🇺🇸 美股",
    items: [
      { symbol: "FOREXCOM:SPXUSD", name: "S&P 500" },
      { symbol: "NASDAQ:NDX", name: "纳斯达克100" },
      { symbol: "DJ:DJI", name: "道琼斯" },
    ],
  },
  {
    label: "🇨🇳 A股",
    items: [
      { symbol: "SSE:000300", name: "沪深300" },
      { symbol: "SSE:000001", name: "上证指数" },
      { symbol: "SZSE:399006", name: "创业板指" },
      { symbol: "SSE:000905", name: "中证500" },
    ],
  },
  {
    label: "🇭🇰 港股",
    items: [
      { symbol: "HSI:HSI", name: "恒生指数" },
      { symbol: "TVC:HSTECH", name: "恒生科技" },
    ],
  },
  {
    label: "🇯🇵 日股",
    items: [
      { symbol: "TVC:NI225", name: "日经225" },
      { symbol: "TSE:TOPIX", name: "东证指数" },
    ],
  },
];

export default function MarketPage() {
  return (
    <div className="space-y-6 pb-8">
      {/* 顶部 Ticker Tape 滚动条 */}
      <div className="w-full">
        <TickerTape symbols={tickerSymbols} />
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-8">
        {/* 指数 Mini Chart 网格，按市场分组 */}
        {indexGroups.map((group) => (
          <section key={group.label}>
            <h2 className="text-lg font-semibold mb-3">{group.label}</h2>
            <div className="grid grid-cols-2 gap-4">
              {group.items.map((item) => (
                <div
                  key={item.symbol}
                  className="rounded-lg border bg-card overflow-hidden"
                >
                  <MiniChart symbol={item.symbol} />
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* VIX 恐慌/波动区域 */}
        <section>
          <h2 className="text-lg font-semibold mb-3">📉 恐慌与波动 (VIX)</h2>
          <VixSentiment />
          <div className="mt-4 rounded-lg border bg-card overflow-hidden">
            <AdvancedChart symbol="CBOE:VIX" height={450} />
          </div>
        </section>
      </div>
    </div>
  );
}
