import { NextResponse } from "next/server";

import { db } from "@/db";
import { requireUser } from "@/lib/auth/auth-utils";
import { getNetvalueListPage } from "@/lib/services/netvalue-history-service";
import { clampNetvaluePage, clampNetvaluePageSize } from "@/lib/services/netvalue-history-helpers";

export async function GET(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const { searchParams } = new URL(request.url);
  const page = clampNetvaluePage(Number(searchParams.get("page") ?? 1));
  const pageSize = clampNetvaluePageSize(Number(searchParams.get("pageSize") ?? 30));

  const result = await getNetvalueListPage(db, userId, { page, pageSize });
  return NextResponse.json(result);
}
