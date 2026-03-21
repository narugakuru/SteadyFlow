import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/auth-utils";
import { runMutationWithNetvalue } from "@/lib/services/mutation-with-netvalue";
import { syncHoldingPricesForUser } from "@/lib/services/holding-price-sync-service";
import type { QuoteSyncTriggerSource } from "@/lib/utils/quote-sync";

function normalizeTrigger(raw: string | null): QuoteSyncTriggerSource {
  if (raw === "silent-client" || raw === "cron") {
    return raw;
  }
  return "manual";
}

export async function POST(request: Request) {
  const { userId, response: authResponse } = await requireUser();
  if (!userId) return authResponse;

  const trigger = normalizeTrigger(new URL(request.url).searchParams.get("trigger"));
  const result = await syncHoldingPricesForUser(userId, { trigger });
  const responsePayload = {
    updated: result.updated,
    failed: result.failed,
    skipped: result.skipped,
  };

  const resultResponse = NextResponse.json(responsePayload);
  const shouldRefreshNetvalue = result.updated.length > 0 || result.exchangeRates.source === "api";

  if (!shouldRefreshNetvalue) {
    return resultResponse;
  }

  return runMutationWithNetvalue(userId, async () => resultResponse);
}
