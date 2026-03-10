import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/auth-utils";
import {
  DEFAULT_NETVALUE_TIMEZONE,
  isValidIanaTimeZone,
  normalizeNetvalueTimeZone,
} from "@/lib/utils/timezone";
import {
  deleteSetting,
  readUserSettingsMap,
  SETTING_KEYS,
  upsertSetting,
} from "@/lib/services/settings-service";

export async function GET() {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const result = await readUserSettingsMap(userId);
  return NextResponse.json({
    warningThreshold: parseFloat(result.get(SETTING_KEYS.warningThreshold) ?? "5"),
    dangerThreshold: parseFloat(result.get(SETTING_KEYS.dangerThreshold) ?? "15"),
    colorMode: result.get(SETTING_KEYS.colorMode) ?? "cn",
    netvalueTimezone: normalizeNetvalueTimeZone(result.get(SETTING_KEYS.netvalueTimezone)),
    twelveDataApiKey: result.get(SETTING_KEYS.twelveDataApiKey) ?? "",
    eodhdApiKey: result.get(SETTING_KEYS.eodhdApiKey) ?? "",
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
    const settingMap = await readUserSettingsMap(userId);
    normalizedTimeZone = normalizeNetvalueTimeZone(settingMap.get(SETTING_KEYS.netvalueTimezone));
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
