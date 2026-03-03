import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth/auth-utils";
import {
  DEFAULT_NETVALUE_TIMEZONE,
  isValidIanaTimeZone,
  normalizeNetvalueTimeZone,
} from "@/lib/utils/timezone";

const SETTING_KEYS = {
  warningThreshold: "warning_threshold",
  dangerThreshold: "danger_threshold",
  colorMode: "color_mode",
  netvalueTimezone: "netvalue.timezone",
  twelveDataApiKey: "quote_api.twelvedata_key",
  eodhdApiKey: "quote_api.eodhd_key",
} as const;

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

async function deleteSetting(userId: string, key: string) {
  await db.delete(settings).where(and(eq(settings.userId, userId), eq(settings.key, key)));
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
    warningThreshold: parseFloat(result[SETTING_KEYS.warningThreshold] ?? "5"),
    dangerThreshold: parseFloat(result[SETTING_KEYS.dangerThreshold] ?? "15"),
    colorMode: result[SETTING_KEYS.colorMode] ?? "cn",
    netvalueTimezone: normalizeNetvalueTimeZone(result[SETTING_KEYS.netvalueTimezone]),
    twelveDataApiKey: result[SETTING_KEYS.twelveDataApiKey] ?? "",
    eodhdApiKey: result[SETTING_KEYS.eodhdApiKey] ?? "",
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

  await upsertSetting(userId, SETTING_KEYS.warningThreshold, String(warningThreshold));
  await upsertSetting(userId, SETTING_KEYS.dangerThreshold, String(dangerThreshold));

  const normalizedColorMode = colorMode === "us" ? "us" : "cn";
  await upsertSetting(userId, SETTING_KEYS.colorMode, normalizedColorMode);

  let normalizedTimeZone = DEFAULT_NETVALUE_TIMEZONE;
  if (netvalueTimezone !== undefined) {
    normalizedTimeZone = normalizeNetvalueTimeZone(netvalueTimezone);
    await upsertSetting(userId, SETTING_KEYS.netvalueTimezone, normalizedTimeZone);
  } else {
    const [existingTimeZone] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, SETTING_KEYS.netvalueTimezone)))
      .limit(1);
    normalizedTimeZone = normalizeNetvalueTimeZone(existingTimeZone?.value);
  }

  if (typeof body.twelveDataApiKey === "string") {
    const value = body.twelveDataApiKey.trim();
    if (value) {
      await upsertSetting(userId, SETTING_KEYS.twelveDataApiKey, value);
    } else {
      await deleteSetting(userId, SETTING_KEYS.twelveDataApiKey);
    }
  }

  if (typeof body.eodhdApiKey === "string") {
    const value = body.eodhdApiKey.trim();
    if (value) {
      await upsertSetting(userId, SETTING_KEYS.eodhdApiKey, value);
    } else {
      await deleteSetting(userId, SETTING_KEYS.eodhdApiKey);
    }
  }

  return NextResponse.json({
    warningThreshold,
    dangerThreshold,
    colorMode: normalizedColorMode,
    netvalueTimezone: normalizedTimeZone,
    twelveDataApiKey: typeof body.twelveDataApiKey === "string" ? body.twelveDataApiKey.trim() : "",
    eodhdApiKey: typeof body.eodhdApiKey === "string" ? body.eodhdApiKey.trim() : "",
  });
}
