import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth-utils";

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
  });
}

export async function PUT(request: Request) {
  const { userId, response } = await requireUser();
  if (!userId) {
    return response;
  }

  const body = await request.json();
  const { warningThreshold, dangerThreshold, colorMode } = body;

  if (warningThreshold == null || dangerThreshold == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert warning_threshold
  const [existingWarn] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, "warning_threshold")));
  if (existingWarn) {
    await db.update(settings)
      .set({ value: String(warningThreshold) })
      .where(and(eq(settings.userId, userId), eq(settings.key, "warning_threshold")));
  } else {
    await db.insert(settings).values({ userId, key: "warning_threshold", value: String(warningThreshold) });
  }

  // Upsert danger_threshold
  const [existingDanger] = await db
    .select()
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, "danger_threshold")));
  if (existingDanger) {
    await db.update(settings)
      .set({ value: String(dangerThreshold) })
      .where(and(eq(settings.userId, userId), eq(settings.key, "danger_threshold")));
  } else {
    await db.insert(settings).values({ userId, key: "danger_threshold", value: String(dangerThreshold) });
  }

  // Upsert color_mode
  if (colorMode) {
    const [existingColor] = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, "color_mode")));
    if (existingColor) {
      await db.update(settings)
        .set({ value: String(colorMode) })
        .where(and(eq(settings.userId, userId), eq(settings.key, "color_mode")));
    } else {
      await db.insert(settings).values({ userId, key: "color_mode", value: String(colorMode) });
    }
  }

  return NextResponse.json({ warningThreshold, dangerThreshold, colorMode: colorMode ?? "cn" });
}
