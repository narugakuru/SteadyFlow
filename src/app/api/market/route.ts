import { NextResponse } from "next/server";
import { fetchMarketData } from "@/lib/data-source/market-data";

export async function GET() {
  // fetchMarketData 内部已处理异常，始终返回完整市场聚合响应（单项失败时局部兜底）
  const data = await fetchMarketData();
  return NextResponse.json(data);
}
