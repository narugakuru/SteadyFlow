"use client";

import { useEffect, useRef } from "react";

interface AdvancedChartProps {
  symbol: string;
  width?: string | number;
  height?: number;
  colorTheme?: "dark" | "light";
  interval?: string;
}

export function AdvancedChart({
  symbol,
  width = "100%",
  height = 400,
  colorTheme = "dark",
  interval = "D",
}: AdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    widgetDiv.style.height = `${height}px`;
    widgetDiv.style.width = typeof width === "number" ? `${width}px` : width;
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.textContent = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Asia/Shanghai",
      theme: colorTheme,
      style: "1",
      locale: "zh_CN",
      allow_symbol_change: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, width, height, colorTheme, interval]);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div
        className="tradingview-widget-container__widget"
        style={{
          height: `${height}px`,
          width: typeof width === "number" ? `${width}px` : width,
        }}
      />
    </div>
  );
}
