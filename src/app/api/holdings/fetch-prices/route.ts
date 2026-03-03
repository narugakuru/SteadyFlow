import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/auth-utils";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";
import { syncHoldingPricesForUser } from "@/lib/services/holding-price-sync-service";

export async function POST() {
  const { userId, response: authResponse } = await requireUser();
  if (!userId) return authResponse;

  const result = await syncHoldingPricesForUser(userId);
  const responsePayload = {
    updated: result.updated,
    failed: result.failed,
    skipped: result.skipped,
  };

  const resultResponse = NextResponse.json(responsePayload);
  if (result.updated.length === 0) {
    return resultResponse;
  }

  return runMutationWithNetvalue(userId, async () => resultResponse);
}
