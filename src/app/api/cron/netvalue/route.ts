import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { recordTodayNetvalue } from "@/lib/netvalue-service";
import { getTimePartsInTimeZone, normalizeNetvalueTimeZone } from "@/lib/timezone";

function getCronSecretFromRequest(request: Request): string {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length);
  }
  return request.headers.get("x-cron-secret") ?? "";
}

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  const requestSecret = getCronSecretFromRequest(request);
  if (!requestSecret || requestSecret !== configuredSecret) {
    return NextResponse.json({ error: "Unauthorized cron request" }, { status: 401 });
  }

  const now = new Date();
  const allUsers = await db.select({ id: users.id }).from(users);
  if (allUsers.length === 0) {
    return NextResponse.json({
      scannedUsers: 0,
      triggeredUsers: 0,
      succeeded: 0,
      failed: 0,
      executedAt: now.toISOString(),
    });
  }

  const userIds = allUsers.map((user: { id: string }) => user.id);
  const timezoneRows = await db
    .select({
      userId: settings.userId,
      value: settings.value,
    })
    .from(settings)
    .where(and(eq(settings.key, "netvalue.timezone"), inArray(settings.userId, userIds)));
  const timeZoneMap = new Map<string, string>(
    timezoneRows.map((row: { userId: string; value: string }) => [
      row.userId,
      normalizeNetvalueTimeZone(row.value),
    ])
  );

  let triggeredUsers = 0;
  let succeeded = 0;
  let failed = 0;

  for (const user of allUsers as { id: string }[]) {
    const timeZone = timeZoneMap.get(user.id) ?? normalizeNetvalueTimeZone(undefined);
    const localTime = getTimePartsInTimeZone(now, timeZone);
    if (localTime.hour !== 3) {
      continue;
    }

    triggeredUsers += 1;
    try {
      await recordTodayNetvalue(user.id, { timeZone, now });
      succeeded += 1;
    } catch (error) {
      failed += 1;
      console.error(`[cron/netvalue] failed for user ${user.id}`, error);
    }
  }

  return NextResponse.json({
    scannedUsers: allUsers.length,
    triggeredUsers,
    succeeded,
    failed,
    executedAt: now.toISOString(),
  });
}
