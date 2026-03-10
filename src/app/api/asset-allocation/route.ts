import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/auth-utils";
import { buildAllocationData } from "@/lib/services/portfolio-snapshot-service";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  return NextResponse.json(await buildAllocationData(userId));
}
