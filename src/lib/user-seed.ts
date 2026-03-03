import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { assetClasses, settings } from "@/db/schema";

const DEFAULT_ASSET_CLASSES = [
  { name: "股票", targetPct: 40, sortOrder: 1 },
  { name: "黄金", targetPct: 10, sortOrder: 2 },
  { name: "债券", targetPct: 20, sortOrder: 3 },
  { name: "现金", targetPct: 30, sortOrder: 4 },
];

const DEFAULT_SETTINGS = [
  { key: "warning_threshold", value: "5" },
  { key: "danger_threshold", value: "15" },
];

export async function seedUserData(userId: string) {
  const existingClasses = await db
    .select()
    .from(assetClasses)
    .where(eq(assetClasses.userId, userId));

  if (existingClasses.length === 0) {
    await db.insert(assetClasses).values(
      DEFAULT_ASSET_CLASSES.map((item) => ({
        ...item,
        userId,
      }))
    );
  }

  for (const setting of DEFAULT_SETTINGS) {
    const existingSetting = await db
      .select()
      .from(settings)
      .where(and(eq(settings.userId, userId), eq(settings.key, setting.key)));

    if (existingSetting.length === 0) {
      await db.insert(settings).values({
        userId,
        key: setting.key,
        value: setting.value,
      });
    }
  }
}
