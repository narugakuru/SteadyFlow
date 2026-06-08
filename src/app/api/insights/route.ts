import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/auth-utils";
import { buildPortfolioInsights } from "@/lib/services/portfolio-insights-service";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  return NextResponse.json(await buildPortfolioInsights(userId));
}
