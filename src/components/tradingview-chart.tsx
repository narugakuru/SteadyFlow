"use client";

import { useEffect, useRef, useState, memo, useCallback } from "react";
import { ExternalLink } from "lucide-react";

interface TradingViewChartProps {
  symbol: string;
  /** 高度占视口百分比，默认 60 即 60vh */
  heightVh?: number;
}

function TradingViewChartInner({ symbol, heightVh = 60 }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [computedHeight, setComputedHeight] = useState(() =>
    typeof window !== "undefined" ? Math.round(window.innerHeight * (heightVh / 100)) : 600
  );

  // 监听窗口 resize，重新计算高度
  const updateHeight = useCallback(() => {
    setComputedHeight(Math.round(window.innerHeight * (heightVh / 100)));
  }, [heightVh]);

  useEffect(() => {
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, [updateHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "tradingview-widget-container__widget";
    wrapper.style.height = `${computedHeight}px`;
    wrapper.style.width = "100%";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: computedHeight,
      symbol,
      interval: "D",
      timezone: "Asia/Shanghai",
      theme: "dark",
      style: "1",
      locale: "zh_CN",
      allow_symbol_change: false,
      support_host: "https://www.tradingview.com",
    });

    script.onerror = () => {
      container.innerHTML = "";
      const fallback = document.createElement("div");
      fallback.className = "flex flex-col items-center justify-center text-muted-foreground gap-2";
      fallback.style.height = `${computedHeight}px`;
      fallback.innerHTML = `<p>该指数暂不支持图表展示</p>`;
      container.appendChild(fallback);
    };

    container.appendChild(wrapper);
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, computedHeight]);

  return (
    <div>
      <div
        ref={containerRef}
        className="tradingview-widget-container rounded-lg overflow-hidden border"
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
