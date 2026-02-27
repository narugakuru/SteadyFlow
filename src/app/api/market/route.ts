import { NextResponse } from "next/server";
import { fetchMarketData } from "@/lib/market-data";

export async function GET() {
  // fetchMarketData 内部已处理异常，始终返回完整指数列表（失败时价格为空）
  const data = await fetchMarketData();
  return NextResponse.json(data);
}
