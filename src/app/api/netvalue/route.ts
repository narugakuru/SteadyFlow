import { NextResponse } from "next/server";

import { db } from "@/db";
import { requireUser } from "@/lib/auth/auth-utils";
import { getAllNetvalueRecords } from "@/lib/services/netvalue-history-service";
import { recordTodayNetvalue } from "@/lib/services/netvalue-service";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const records = await getAllNetvalueRecords(db, userId);
  return NextResponse.json(records);
}

export async function POST() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const result = await recordTodayNetvalue(userId);
  return NextResponse.json(result);
}
