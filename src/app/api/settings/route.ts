import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";
import {
  DEFAULT_NETVALUE_TIMEZONE,
  isValidIanaTimeZone,
  normalizeNetvalueTimeZone,
} from "@/lib/timezone";

async function upsertSetting(userId: string, key: string, value: string) {
  const [existing] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, key)))
    .limit(1);

  if (existing) {
    await db
      .update(settings)
      .set({ value })
      .where(and(eq(settings.userId, userId), eq(settings.key, key)));
    return;
  }

  await db.insert(settings).values({ userId, key, value });
}

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const rows = await db.select().from(settings).where(eq(settings.userId, userId));
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return NextResponse.json({
    warningThreshold: parseFloat(result.warning_threshold ?? "5"),
    dangerThreshold: parseFloat(result.danger_threshold ?? "15"),
    colorMode: result.color_mode ?? "cn",
    netvalueTimezone: normalizeNetvalueTimeZone(result["netvalue.timezone"]),
  });
}

export async function PUT(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { warningThreshold, dangerThreshold, colorMode, netvalueTimezone } = body;

  if (warningThreshold == null || dangerThreshold == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (netvalueTimezone !== undefined && !isValidIanaTimeZone(String(netvalueTimezone).trim())) {
    return NextResponse.json({ error: "Invalid IANA timezone" }, { status: 400 });
  }

  await upsertSetting(userId, "warning_threshold", String(warningThreshold));
  await upsertSetting(userId, "danger_threshold", String(dangerThreshold));

  const normalizedColorMode = colorMode === "us" ? "us" : "cn";
  await upsertSetting(userId, "color_mode", normalizedColorMode);

  let normalizedTimeZone = DEFAULT_NETVALUE_TIMEZONE;
  if (netvalueTimezone !== undefined) {
    normalizedTimeZone = normalizeNetvalueTimeZone(netvalueTimezone);
    await upsertSetting(userId, "netvalue.timezone", normalizedTimeZone);
  } else {
    const [existingTimeZone] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, "netvalue.timezone")))
      .limit(1);
    normalizedTimeZone = normalizeNetvalueTimeZone(existingTimeZone?.value);
  }

  return NextResponse.json({
    warningThreshold,
    dangerThreshold,
    colorMode: normalizedColorMode,
    netvalueTimezone: normalizedTimeZone,
  });
}
