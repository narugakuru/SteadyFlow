import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_NETVALUE_TIMEZONE, normalizeNetvalueTimeZone } from "@/lib/utils/timezone";

export const SETTING_KEYS = {
  warningThreshold: "warning_threshold",
  dangerThreshold: "danger_threshold",
  colorMode: "color_mode",
  netvalueTimezone: "netvalue.timezone",
  performanceStartDate: "performance.start_date",
  twelveDataApiKey: "quote_api.twelvedata_key",
  eodhdApiKey: "quote_api.eodhd_key",
} as const;

export interface PublicUserSettings {
  warningThreshold: number;
  dangerThreshold: number;
  colorMode: "cn" | "us";
  netvalueTimezone: string;
  performanceStartDate: string;
}

export async function readUserSettingsMap(userId: string) {
  const rows = await db.select().from(settings).where(eq(settings.userId, userId));
  return new Map<string, string>(
    rows.map((row: { key: string; value: string }) => [row.key, row.value])
  );
}

export function getPublicUserSettingsFromMap(
  settingMap: ReadonlyMap<string, string>
): PublicUserSettings {
  return {
    warningThreshold: parseFloat(settingMap.get(SETTING_KEYS.warningThreshold) ?? "5"),
    dangerThreshold: parseFloat(settingMap.get(SETTING_KEYS.dangerThreshold) ?? "15"),
    colorMode: settingMap.get(SETTING_KEYS.colorMode) === "us" ? "us" : "cn",
    netvalueTimezone: normalizeNetvalueTimeZone(
      settingMap.get(SETTING_KEYS.netvalueTimezone) ?? DEFAULT_NETVALUE_TIMEZONE
    ),
    performanceStartDate: settingMap.get(SETTING_KEYS.performanceStartDate) ?? "",
  };
}

export async function getPublicUserSettings(userId: string) {
  return getPublicUserSettingsFromMap(await readUserSettingsMap(userId));
}

export async function upsertSetting(userId: string, key: string, value: string) {
  const [existing] = await db
    .select({ id: settings.id })
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

export async function deleteSetting(userId: string, key: string) {
  await db.delete(settings).where(and(eq(settings.userId, userId), eq(settings.key, key)));
}
