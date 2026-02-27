"use client";

import { useEffect, useRef, memo } from "react";
import { ExternalLink } from "lucide-react";

interface TradingViewChartProps {
  symbol: string;
  height?: number;
}

function TradingViewChartInner({ symbol, height = 500 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 清空旧 widget
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Asia/Shanghai",
      theme: "dark",
      style: "1",
      locale: "zh_CN",
      allow_symbol_change: false,
      support_host: "https://www.tradingview.com",
    });

    // 加载失败兜底
    script.onerror = () => {
      container.innerHTML = "";
      const fallback = document.createElement("div");
      fallback.className =
        "flex flex-col items-center justify-center h-full text-muted-foreground gap-2";
      fallback.innerHTML = `<p>该指数暂不支持图表展示</p>`;
      container.appendChild(fallback);
    };

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = "calc(100% - 32px)";
    wrapper.style.width = "100%";

    container.appendChild(wrapper);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div>
      <div
        ref={containerRef}
        className="tradingview-widget-container rounded-lg overflow-hidden border"
        style={{ height }}
      />
      <div className="flex justify-end mt-2">
        <a
          href={`https://www.tradingview.com/chart/?symbol=${symbol}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          在 TradingView 查看 <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
