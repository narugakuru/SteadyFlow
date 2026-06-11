import { NextResponse } from "next/server";

import { db } from "@/db";
import { requireUser } from "@/lib/auth/auth-utils";
import { getNetvaluePerformance } from "@/lib/services/performance-service";
import { isNetvalueChartRange } from "@/lib/services/netvalue-history-helpers";
import type { NetvalueChartRange } from "@/lib/utils/types";

const DEFAULT_RANGE: NetvalueChartRange = "30d";

export async function GET(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const rangeParam = searchParams.get("range");
  const range = isNetvalueChartRange(rangeParam) ? rangeParam : DEFAULT_RANGE;

  const result = await getNetvaluePerformance(db, userId, range);
  return NextResponse.json(result);
}
