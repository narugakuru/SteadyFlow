import { NextResponse } from "next/server";
import { getExchangeRates } from "@/lib/data-source/exchange-rate";

export async function GET() {
  const result = await getExchangeRates();
  return NextResponse.json(result);
}
