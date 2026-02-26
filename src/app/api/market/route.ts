import { NextResponse } from "next/server";
import { fetchMarketData } from "@/lib/market-data";

export async function GET() {
  try {
    const data = await fetchMarketData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
