"use client";

import { useEffect, useRef } from "react";

interface TickerTapeSymbol {
  proName: string;
  title: string;
}

interface TickerTapeProps {
  symbols: TickerTapeSymbol[];
  colorTheme?: "dark" | "light";
}

export function TickerTape({ symbols, colorTheme = "dark" }: TickerTapeProps) {
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
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.type = "text/javascript";
    script.textContent = JSON.stringify({
      symbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme,
      locale: "zh_CN",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbols, colorTheme]);

  return (
    <div className="tradingview-widget-container" ref={containerRef}>
      <div className="tradingview-widget-container__widget" />
    </div>
  );
}
