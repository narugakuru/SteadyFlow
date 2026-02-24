import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = db.select().from(settings).all();
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return NextResponse.json({
    warningThreshold: parseFloat(result.warning_threshold ?? "3"),
    dangerThreshold: parseFloat(result.danger_threshold ?? "5"),
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { warningThreshold, dangerThreshold } = body;

  if (warningThreshold == null || dangerThreshold == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Upsert warning_threshold
  const existingWarn = db.select().from(settings).where(eq(settings.key, "warning_threshold")).get();
  if (existingWarn) {
    db.update(settings).set({ value: String(warningThreshold) }).where(eq(settings.key, "warning_threshold")).run();
  } else {
    db.insert(settings).values({ key: "warning_threshold", value: String(warningThreshold) }).run();
  }

  // Upsert danger_threshold
  const existingDanger = db.select().from(settings).where(eq(settings.key, "danger_threshold")).get();
  if (existingDanger) {
    db.update(settings).set({ value: String(dangerThreshold) }).where(eq(settings.key, "danger_threshold")).run();
  } else {
    db.insert(settings).values({ key: "danger_threshold", value: String(dangerThreshold) }).run();
  }

  return NextResponse.json({ warningThreshold, dangerThreshold });
}
