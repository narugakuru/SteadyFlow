"use client";

import { useEffect, useRef } from "react";

interface MiniChartProps {
  symbol: string;
  width?: string | number;
  height?: string | number;
  colorTheme?: "dark" | "light";
  dateRange?: "1D" | "1M" | "3M" | "12M" | "60M" | "ALL";
}

export function MiniChart({
  symbol,
  width = "100%",
  height = 220,
  colorTheme = "dark",
  dateRange = "12M",
}: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.type = "text/javascript";
    script.textContent = JSON.stringify({
      symbol,
      width,
      height,
      locale: "zh_CN",
      dateRange,
      colorTheme,
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, width, height, colorTheme, dateRange]);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}
